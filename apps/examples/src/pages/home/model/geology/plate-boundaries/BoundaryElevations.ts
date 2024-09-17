import { EARTH_RADIUS } from "@hello-worlds/planets"
import { easeInQuint, saturate } from "../../../math/easings"
import { subductingSpline, superductingSpline } from "./BoundarySplines"

// one for every 10 degrees arc along the equator
const maxPlateDepthConstant = (2 * Math.PI * EARTH_RADIUS) / (18 * 2)
export const getT = (
  distanceToPlateBoundary: number,
  distanceToPlateRoot: number,
) => {
  return saturate(
    distanceToPlateBoundary / (distanceToPlateBoundary + distanceToPlateRoot),
  )
}

export function calculateCollidingElevation(
  t: number,
  // distanceToPlateRoot: number,
  boundaryElevation: number,
  plateElevation: number,
) {
  return (
    plateElevation + Math.pow(1.0 - t, 2) * (boundaryElevation - plateElevation)
  )
}

export function calculateSuperductingElevation(
  t: number,
  oppositeRegionElevation: number,
  boundaryElevation: number,
  plateElevation: number,
  pressure: number,
) {
  return superductingSpline(
    boundaryElevation,
    pressure,
    plateElevation,
    oppositeRegionElevation,
  )(t)
}

export function calculateSubductingElevation(
  t: number,
  oppositeRegionElevation: number,
  boundaryElevation: number,
  plateElevation: number,
  pressure: number,
) {
  // simulate accretion arc
  // simulate subduction trenches
  // slope back upwards
  return subductingSpline(
    boundaryElevation,
    pressure,
    plateElevation,
    oppositeRegionElevation,
  )(t)
}

export function calculateDivergingElevation(
  t: number,
  boundaryElevation: number,
  plateElevation: number,
) {
  if (t < 0.3) {
    t = t / 0.3
    return (
      plateElevation +
      easeInQuint(Math.pow(t - 1, 2) * (boundaryElevation - plateElevation))
    )
  } else {
    return plateElevation
  }
}

export function calculateShearingElevation(
  t: number,
  boundaryElevation: number,
  plateElevation: number,
) {
  if (t < 0.01) {
    t = t / 0.2
    return (
      plateElevation + Math.pow(t - 1, 2) * (boundaryElevation - plateElevation)
    )
  } else {
    return plateElevation
  }
}

export function calculateDormantElevation(
  t: number,
  boundaryElevation: number,
  plateElevation: number,
) {
  let elevationDifference = boundaryElevation - plateElevation
  const newElevation =
    t * t * elevationDifference * (2 * t - 3) + boundaryElevation
  return newElevation
}
