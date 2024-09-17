import { Vector3 } from "three"

export const humanReadableDistance = (distanceInMeters: number) => {
  if (distanceInMeters < 1000) {
    return `${distanceInMeters.toFixed(0)}m`
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`
  }
}

export const haversineDistance = (a: Vector3, b: Vector3, radius: number) => {
  const R = radius // metres
  const φ1 = (a.x * Math.PI) / 180 // φ, λ in radians
  const φ2 = (b.x * Math.PI) / 180
  const Δφ = ((b.x - a.x) * Math.PI) / 180
  const Δλ = ((b.y - a.y) * Math.PI) / 180

  const a_ =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a_), Math.sqrt(1 - a_))

  const d = R * c // in metres
  return d
}
