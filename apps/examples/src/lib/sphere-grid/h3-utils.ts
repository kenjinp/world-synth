import { LatLong } from "@hello-worlds/planets"
import { UNITS, cellArea, gridDisk, latLngToCell } from "h3-js"
// https://observablehq.com/@nrabinowitz/h3-radius-lookup

/**
 * Calculate the indexes within the radius based on the search area
 */
export function kRingIndexesArea(
  searchLocation: LatLong,
  searchRadiusInMeters: number,
  resolution: number,
) {
  const origin = latLngToCell(
    searchLocation.lat,
    searchLocation.lon,
    resolution,
  )
  const searchRadiusKm = searchRadiusInMeters / 1000
  const originArea = cellArea(origin, UNITS.km2)
  const searchArea = Math.PI * searchRadiusKm * searchRadiusKm

  let radius = 0
  let diskArea = originArea

  while (diskArea < searchArea) {
    radius++
    const cellCount = 3 * radius * (radius + 1) + 1
    diskArea = cellCount * originArea
  }

  return gridDisk(origin, radius)
}
