export function slow(ms: number): number {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
  return ms;
}
