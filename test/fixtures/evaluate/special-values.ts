export function special(kind: unknown): unknown {
  if (kind === undefined) return "got undefined";
  if (kind === "negzero") return -0;
  if (kind === "nan") return NaN;
  if (kind === "inf") return Infinity;
  if (kind === "neginf") return -Infinity;
  if (kind === "undef") return undefined;
  return { value: undefined, list: [NaN, -0, 0] };
}
