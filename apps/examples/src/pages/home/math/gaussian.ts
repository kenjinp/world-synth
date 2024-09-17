import { random } from "@hello-worlds/core"

export const randomGaussian = (mean: number, stdDev: number) => {
  let u = 0
  let v = 0
  // prevent from returning 0
  while (u === 0) u = random()
  while (v === 0) v = random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + z * stdDev
}
