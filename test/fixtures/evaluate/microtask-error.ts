export function double(n: number): number {
  if (n === 1) {
    queueMicrotask(() => {
      throw new Error("left behind");
    });
  }
  return n * 2;
}
