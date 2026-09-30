import { parentPort } from "node:worker_threads";

export function chatty(n: number): number {
  parentPort?.postMessage({ type: "surprise" });
  return n;
}
