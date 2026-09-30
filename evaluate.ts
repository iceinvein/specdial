// Usage: npx tsx evaluate.ts <impl.ts> <corpus.json>
// Prints {"load", "outputs", "hash", "async_errors", "late_async_errors"} for
// the implementation over the corpus. Async side effects are not part of the
// behaviour signature: they are reported beside it, never in outputs or hash.
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
type Output = { ok: unknown } | "THROW" | "TIMEOUT" | "CRASH";

type WorkerSetup = { implUrl: string; functionName: string };
type LoadMessage = { type: "load"; ok: boolean };
// asyncError: the call left an async error that surfaced before the result
// was posted. lateErrors: errors that surfaced while no call was in its round,
// counted since the previous result.
type ResultMessage = { type: "result"; output: string; asyncError: boolean; lateErrors: number };

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
  return { $unsupported: unsupportedName(value) };
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function unsupportedName(value: unknown): string {
  if (typeof value !== "object" && typeof value !== "function") return typeof value;
  const name = (value as { constructor?: { name?: unknown } }).constructor?.name;
  if (typeof name === "string" && name !== "") return name;
  // No usable constructor (for example Object.create(proto)): fall back to the
  // built-in tag, such as "Object".
  return Object.prototype.toString.call(value).slice("[object ".length, -1);
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
  // A leftover async error must not kill the worker, or it would land on
  // whichever input happens to be running when it surfaces.
  let inRound = false;
  let roundErrors = 0;
  let lateErrors = 0;
  const countAsyncError = () => {
    if (inRound) roundErrors++;
    else lateErrors++;
  };
  process.on("uncaughtException", countAsyncError);
  process.on("unhandledRejection", countAsyncError);
  port.postMessage({ type: "load", ok: true } satisfies LoadMessage);

  port.on("message", (inputJson: string) => {
    const input = JSON.parse(inputJson) as CorpusInput;
    const args = input.args.map(decodeArg);
    inRound = true;
    roundErrors = 0;
    let output: string;
    let returned: unknown;
    let threw = false;
    try {
      returned = (fn as (...a: unknown[]) => unknown)(...args);
    } catch {
      threw = true;
    }
    if (threw) {
      output = JSON.stringify("THROW");
    } else {
      try {
        output = JSON.stringify({ ok: canon(returned, input.probe) });
      } catch {
        // A getter that throws or a cyclic value breaks canonicalisation. The
        // uncaughtException handler would otherwise swallow it and no result
        // would ever be posted.
        output = JSON.stringify("CRASH");
      }
    }
    // One setImmediate round lets microtask throws and rejections raised by
    // this call surface and be counted against it.
    setImmediate(() => {
      inRound = false;
      const message: ResultMessage = { type: "result", output, asyncError: roundErrors > 0, lateErrors };
      lateErrors = 0;
      port.postMessage(message);
    });
  });
}

// Wraps one worker so the main thread can await its next message, a timeout,
// or the worker dying, whichever comes first. Dying before the worker starts
// running is a harness error; dying after that is the implementation's doing.
class ImplWorker {
  private worker: Worker;
  private online = false;
  dead = false;
  private pending: {
    resolve: (message: LoadMessage | ResultMessage | "CRASH") => void;
    reject: (error: Error) => void;
  } | null = null;

  constructor(setup: WorkerSetup) {
    this.worker = new Worker(new URL(import.meta.url), { workerData: setup, stdout: true, stderr: true });
    // The implementation's own console output must not reach our stdout.
    this.worker.stdout.resume();
    this.worker.stderr.resume();
    this.worker.on("online", () => {
      this.online = true;
    });
    this.worker.on("message", (message: LoadMessage | ResultMessage) => {
      const pending = this.pending;
      this.pending = null;
      pending?.resolve(message);
    });
    this.worker.on("error", (error) => this.die(error));
    this.worker.on("exit", (code) => this.die(new Error(`evaluate: worker exited with code ${code}`)));
  }

  private die(error: Error): void {
    this.dead = true;
    const pending = this.pending;
    this.pending = null;
    if (!pending) return;
    if (this.online) pending.resolve("CRASH");
    else pending.reject(new Error(`evaluate: worker could not start: ${error.message}`));
  }

  next(timeoutMs: number): Promise<LoadMessage | ResultMessage | "TIMEOUT" | "CRASH"> {
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
    this.worker.removeAllListeners();
    await this.worker.terminate();
  }
}

async function startWorker(setup: WorkerSetup): Promise<ImplWorker | null> {
  const worker = new ImplWorker(setup);
  const message = await worker.next(LOAD_TIMEOUT_MS);
  if (message === "TIMEOUT" || message === "CRASH" || message.type !== "load" || !message.ok) {
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
  const asyncErrors: number[] = [];
  let lateAsyncErrors = 0;
  try {
    for (const [index, input] of corpus.inputs.entries()) {
      // A worker can also die between inputs (process.exit from a timer a
      // previous call left behind); that input already has its output.
      if (worker?.dead) {
        await worker.terminate();
        worker = null;
      }
      if (!worker) {
        // Started lazily so a timeout or crash on the last input does not load a worker nobody uses.
        worker = await startWorker(setup);
        if (!worker) throw new Error(`evaluate: ${implPath} loaded once but failed to reload`);
      }
      worker.send(input);
      const message = await worker.next(INPUT_TIMEOUT_MS);
      if (message === "TIMEOUT" || message === "CRASH") {
        outputs.push(message);
        await worker.terminate();
        worker = null;
        continue;
      }
      if (message.type !== "result") throw new Error(`evaluate: unexpected worker message ${JSON.stringify(message)}`);
      outputs.push(JSON.parse(message.output) as Output);
      if (message.asyncError) asyncErrors.push(index);
      lateAsyncErrors += message.lateErrors;
    }
  } finally {
    await worker?.terminate();
  }

  const hash = createHash("sha256").update(JSON.stringify(outputs), "utf8").digest("hex");
  const result = { load: "ok", outputs, hash, async_errors: asyncErrors, late_async_errors: lateAsyncErrors };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (isMainThread) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
} else {
  await runWorker();
}
