class Point {
  constructor(public x: number) {}
}

export function odd(kind: string): unknown {
  if (kind === "map") return new Map([["a", 1]]);
  if (kind === "bigint") return 10n;
  if (kind === "function") return () => 1;
  if (kind === "symbol") return Symbol("s");
  if (kind === "instance") return new Point(1);
  return { when: new Date(0), tags: [new Set(["a"]), 1] };
}
