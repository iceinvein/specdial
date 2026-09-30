export function keyed(kind: string): Record<string, number> {
  if (kind === "case") return { a: 1, B: 1 };
  return { b: 1, "10": 1, "2": 1 };
}
