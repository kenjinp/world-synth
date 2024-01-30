import { LatLong } from "@hello-worlds/planets"
import { getCoords, lineString, point, pointToLineDistance } from "@turf/turf"
import { CoordPair, cellsToMultiPolygon } from "h3-js"

export class SphericalPolygon {
  shape: CoordPair[][][] = []

  constructor(shape?: CoordPair[][][]) {
    if (!shape) return
    this.shape = shape
  }

  set(shape: CoordPair[][][]) {
    this.shape = shape
    return this
  }

  union() {}

  intersection() {}

  contains() {}

  distanceToPolygonEdge(p: LatLong, polygon: SphericalPolygon) {
    if (!polygon) {
      throw new Error("No polygon")
    }
    const polygonEdges = getCoords(polygon.shape)
    const minDistances = polygonEdges.map(edge => {
      const line = edge.length === 1 ? lineString(edge[0]) : lineString(edge)
      return pointToLineDistance(point([p.lon, p.lat]), line, {
        units: "meters",
        method: "planar",
      })
    })

    // Find the minimum distance from the array of distances
    const minDistance = Math.min(...minDistances)
    return minDistance
  }

  copy(sphericalPolygon: SphericalPolygon) {
    this.shape = sphericalPolygon.shape
    return this
  }

  clone() {
    return new SphericalPolygon(this.shape)
  }

  static fromH3Cell(cell: string) {
    const multiPolygon = cellsToMultiPolygon([cell], false)
    if (!multiPolygon) throw new Error("No multipolygon found")
    return new SphericalPolygon().set(multiPolygon)
  }

  static fromH3Cells(cells: string[]) {
    const multiPolygon = cellsToMultiPolygon(cells, false)
    if (!multiPolygon) throw new Error("No multipolygon found")
    return new SphericalPolygon().set(multiPolygon)
  }
}
