// Usage: npx tsx evaluate.ts <impl.ts> <corpus.json>
// Prints {"load", "outputs", "hash"} for the implementation over the corpus.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

const INPUT_TIMEOUT_MS = 1000;
// A module whose top level never finishes is reported as not loading rather
// than hanging the harness. Generous because tsx compiles the file on import.
const LOAD_TIMEOUT_MS = 10_000;

type CorpusInput = { id: string; args: unknown[]; probe?: string[] };
type Corpus = { function: string; inputs: CorpusInput[] };
type Output = { ok: unknown } | "THROW" | "TIMEOUT";

type WorkerSetup = { implUrl: string; functionName: string };
type LoadMessage = { type: "load"; ok: boolean };
type ResultMessage = { type: "result"; output: string };

function decodeArg(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeArg);
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "$undefined" && (value as { $undefined: unknown }).$undefined === true) {
      return undefined;
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeArg(v)]));
  }
  return value;
}

function canonNumber(n: number): unknown {
  if (Object.is(n, -0)) return { $num: "-0" };
  if (Number.isNaN(n)) return { $num: "NaN" };
  if (n === Infinity) return { $num: "Infinity" };
  if (n === -Infinity) return { $num: "-Infinity" };
  return n;
}

// Integer-like keys still serialise in ascending numeric order, because
// JSON.stringify follows the engine's own-key order; the result is still
// deterministic, which is what the signature hash needs.
function canon(value: unknown, probe: string[] | undefined): unknown {
  if (value === undefined) return { $undefined: true };
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return canonNumber(value);
  if (value instanceof RegExp) {
    if (probe) return probe.map((path) => new RegExp(value.source, value.flags).test(path));
    return { $regex: value.source, flags: value.flags };
  }
  if (Array.isArray(value)) {
    return Array.from({ length: value.length }, (_, i) => canon(value[i], undefined));
  }
  if (typeof value === "object" && isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return Object.fromEntries(keys.map((k) => [k, canon((value as Record<string, unknown>)[k], undefined)]));
  }
  throw new Error(`evaluate: cannot canonicalise a returned value of type ${describeType(value)}`);
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function describeType(value: unknown): string {
  if (typeof value === "object" && value !== null) return value.constructor?.name ?? "object";
  return typeof value;
}

async function runWorker(): Promise<void> {
  const port = parentPort;
  if (!port) throw new Error("evaluate: worker started without a parent port");
  const { implUrl, functionName } = workerData as WorkerSetup;

  let fn: unknown;
  try {
    const mod = await import(implUrl);
    fn = mod[functionName];
  } catch {
    port.postMessage({ type: "load", ok: false } satisfies LoadMessage);
    return;
  }
  if (typeof fn !== "function") {
    port.postMessage({ type: "load", ok: false } satisfies LoadMessage);
    return;
  }
  port.postMessage({ type: "load", ok: true } satisfies LoadMessage);

  port.on("message", (inputJson: string) => {
    const input = JSON.parse(inputJson) as CorpusInput;
    const args = input.args.map(decodeArg);
    let returned: unknown;
    try {
      returned = (fn as (...a: unknown[]) => unknown)(...args);
    } catch {
      port.postMessage({ type: "result", output: JSON.stringify("THROW") } satisfies ResultMessage);
      return;
    }
    // Canonicalising stays outside the try: a failure here is a harness
    // error, not the implementation throwing.
    const output = JSON.stringify({ ok: canon(returned, input.probe) });
    port.postMessage({ type: "result", output } satisfies ResultMessage);
  });
}

// Wraps one worker so the main thread can await its next message, a timeout,
// or the worker dying, whichever comes first.
class ImplWorker {
  private worker: Worker;
  private pending: {
    resolve: (message: LoadMessage | ResultMessage) => void;
    reject: (error: Error) => void;
  } | null = null;

  constructor(setup: WorkerSetup) {
    this.worker = new Worker(new URL(import.meta.url), { workerData: setup, stdout: true, stderr: true });
    // The implementation's own console output must not reach our stdout.
    this.worker.stdout.resume();
    this.worker.stderr.resume();
    this.worker.on("message", (message: LoadMessage | ResultMessage) => {
      const pending = this.pending;
      this.pending = null;
      pending?.resolve(message);
    });
    this.worker.on("error", (error) => this.fail(error));
    this.worker.on("exit", (code) => this.fail(new Error(`evaluate: worker exited with code ${code}`)));
  }

  private fail(error: Error): void {
    const pending = this.pending;
    this.pending = null;
    pending?.reject(error);
  }

  next(timeoutMs: number): Promise<LoadMessage | ResultMessage | "TIMEOUT"> {
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pending = null;
        resolvePromise("TIMEOUT");
      }, timeoutMs);
      this.pending = {
        resolve: (message) => {
          clearTimeout(timer);
          resolvePromise(message);
        },
        reject: (error) => {
          clearTimeout(timer);
          rejectPromise(error);
        },
      };
    });
  }

  send(input: CorpusInput): void {
    this.worker.postMessage(JSON.stringify(input));
  }

  async terminate(): Promise<void> {
    this.worker.removeAllListeners("exit");
    await this.worker.terminate();
  }
}

async function startWorker(setup: WorkerSetup): Promise<ImplWorker | null> {
  const worker = new ImplWorker(setup);
  const message = await worker.next(LOAD_TIMEOUT_MS);
  if (message === "TIMEOUT" || message.type !== "load" || !message.ok) {
    await worker.terminate();
    return null;
  }
  return worker;
}

function readCorpus(path: string): Corpus {
  const corpus = JSON.parse(readFileSync(path, "utf8")) as Corpus;
  if (typeof corpus.function !== "string" || !Array.isArray(corpus.inputs)) {
    throw new Error(`evaluate: ${path} is not a corpus (needs "function" and "inputs")`);
  }
  for (const input of corpus.inputs) {
    if (!Array.isArray(input.args)) throw new Error(`evaluate: input ${input.id} in ${path} has no "args" array`);
  }
  return corpus;
}

async function main(): Promise<void> {
  const [implPath, corpusPath] = process.argv.slice(2);
  if (!implPath || !corpusPath) throw new Error("usage: npx tsx evaluate.ts <impl.ts> <corpus.json>");
  const corpus = readCorpus(corpusPath);
  const setup: WorkerSetup = { implUrl: pathToFileURL(resolve(implPath)).href, functionName: corpus.function };

  const first = await startWorker(setup);
  if (!first) {
    process.stdout.write(`${JSON.stringify({ load: "noload", outputs: null, hash: null })}\n`);
    return;
  }

  let worker: ImplWorker | null = first;
  const outputs: Output[] = [];
  for (const input of corpus.inputs) {
    if (!worker) {
      // Started lazily so a timeout on the last input does not load a worker nobody uses.
      worker = await startWorker(setup);
      if (!worker) throw new Error(`evaluate: ${implPath} loaded once but failed to reload after a timeout`);
    }
    worker.send(input);
    const message = await worker.next(INPUT_TIMEOUT_MS);
    if (message === "TIMEOUT") {
      outputs.push("TIMEOUT");
      await worker.terminate();
      worker = null;
      continue;
    }
    if (message.type !== "result") throw new Error(`evaluate: unexpected worker message ${JSON.stringify(message)}`);
    outputs.push(JSON.parse(message.output) as Output);
  }
  await worker?.terminate();

  const hash = createHash("sha256").update(JSON.stringify(outputs), "utf8").digest("hex");
  process.stdout.write(`${JSON.stringify({ load: "ok", outputs, hash })}\n`);
}

if (isMainThread) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
} else {
  await runWorker();
}
