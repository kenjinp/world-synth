import { LinearSpline } from "@hello-worlds/planets"
import { lerp } from "three/src/math/MathUtils"
import { easeInQuint } from "../../../math/easings"

export const superductingSpline = (
  boundaryElevation: number,
  pressure: number,
  plateElevation: number,
  neighboringPlateElevation: number,
) => {
  const spline = new LinearSpline((t: number, p0: number, p1: number) => {
    return lerp(p0, p1, t)
  })
  spline.addPoint(0, boundaryElevation)
  spline.addPoint(1 - (easeInQuint(pressure) - 0.5), pressure - 0.5)
  spline.addPoint(easeInQuint(pressure) - 0.5, plateElevation)
  return (normalizedDistanceToEdge: number) => {
    return spline.get(normalizedDistanceToEdge)
  }
}

export const subductingSpline = (
  boundaryElevation: number,
  pressure: number,
  plateElevation: number,
  neighboringPlateElevation: number,
) => {
  const spline = new LinearSpline((t: number, p0: number, p1: number) => {
    return lerp(p0, p1, t)
  })
  spline.addPoint(0, boundaryElevation)
  spline.addPoint(0.2, 0)
  spline.addPoint(0.22, -pressure)
  spline.addPoint(0.3, plateElevation)
  return (normalizedDistanceToEdge: number) => {
    return spline.get(normalizedDistanceToEdge)
  }
}
