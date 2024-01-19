import { LatLong } from "@hello-worlds/planets"

export function sphericalDistance(
  latlong1: LatLong,
  latlong2: LatLong,
): number {
  const lat1 = latlong1.lat
  const lon1 = latlong1.lon
  const lat2 = latlong2.lat
  const lon2 = latlong2.lon
  const earthRadius = 6371 // Radius of the Earth in kilometers

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180
  const lon1Rad = (lon1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const lon2Rad = (lon2 * Math.PI) / 180

  // Haversine formula
  const dLat = lat2Rad - lat1Rad
  const dLon = lon2Rad - lon1Rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Calculate the distance in kilometers
  const distance = earthRadius * c

  return distance
}

export function distanceToGreatCircleLine(
  latLong: LatLong,
  greatCircleLatLongStart: LatLong,
  createCircleLatLongEnd: LatLong,
  radius: number,
): number {
  const lat1 = latLong.lat
  const lon1 = latLong.lon
  const lat2 = greatCircleLatLongStart.lat
  const lon2 = greatCircleLatLongStart.lon
  const lat3 = createCircleLatLongEnd.lat
  const lon3 = createCircleLatLongEnd.lon
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180
  const lon1Rad = (lon1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const lon2Rad = (lon2 * Math.PI) / 180
  const lat3Rad = (lat3 * Math.PI) / 180
  const lon3Rad = (lon3 * Math.PI) / 180

  // Calculate the distance between lat1, lon1 and lat2, lon2 (used later)
  const dLat = lat2Rad - lat1Rad
  const dLon = lon2Rad - lon1Rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceToLine = radius * c

  // Calculate the bearing from lat1, lon1 to lat2, lon2 (used later)
  const y = Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad)
  const bearingToLine = Math.atan2(y, x)

  // Calculate the angle between the great circle line and the point
  const y2 = Math.sin(lon3Rad - lon1Rad) * Math.cos(lat3Rad)
  const x2 =
    Math.cos(lat1Rad) * Math.sin(lat3Rad) -
    Math.sin(lat1Rad) * Math.cos(lat3Rad) * Math.cos(lon3Rad - lon1Rad)
  const angle = Math.atan2(y2, x2)

  // Calculate the distance to the nearest point on the great circle line
  const distanceToNearestPoint = Math.abs(
    distanceToLine * Math.sin(angle - bearingToLine),
  )

  return distanceToNearestPoint
}
