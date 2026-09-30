export function later(n: number): unknown {
  if (n === 1) return Promise.reject(new Error("never observed"));
  if (n === 2) return Promise.resolve(n);
  return n * 2;
}
