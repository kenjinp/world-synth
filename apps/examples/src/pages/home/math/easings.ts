export function easeInQuint(x: number): number {
  return x * x * x * x * x
}

export function saturate(x: number): number {
  return Math.min(1, Math.max(0, x))
}

export function easeInCirc(x: number): number {
  return 1 - Math.sqrt(1 - Math.pow(x, 2))
}
