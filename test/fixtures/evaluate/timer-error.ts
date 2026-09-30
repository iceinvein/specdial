export function identity(n: number): number {
  if (n % 5 === 0) {
    setTimeout(() => {
      throw new Error("late");
    }, 1);
  }
  return n;
}
