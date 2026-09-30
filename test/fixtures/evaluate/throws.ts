export function strictLength(s: string): number {
  if (s === "bad") throw new Error("rejected");
  return s.length;
}
