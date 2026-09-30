export function wrapped(glob: string): RegExp[] {
  return [new RegExp(glob, "i")];
}
