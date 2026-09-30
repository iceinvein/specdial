export function describe(s: string) {
  return { zeta: s.length, alpha: s, mid: { y: [s], x: null } };
}
