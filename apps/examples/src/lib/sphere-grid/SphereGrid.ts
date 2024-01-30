import { LatLong } from "@hello-worlds/planets"
import { latLngToCell, polygonToCells } from "h3-js"
import { Vector3 } from "three"
import { kRingIndexesArea } from "./h3-utils"

export class SphereGrid {
  public cells: Map<string, Set<string>> = new Map()
  public radius: number
  public resolution: number
  public sphereOffset: Vector3 = new Vector3()

  constructor(radius: number, resolution: number, sphereOffset?: Vector3) {
    this.radius = radius
    this.resolution = resolution
    this.sphereOffset = sphereOffset || this.sphereOffset
  }

  // This doesn't appear to work for lattitude > 85degrees
  insertPolygon(objectKey: string, polygon: LatLong[]) {
    try {
      const polygonHexes = polygonToCells(
        polygon.map(latLong => [latLong.lat, latLong.lon]),
        this.resolution,
      )

      if (polygonHexes.length === 0) {
        throw new Error("No hexes found")
      }

      for (const cell of polygonHexes) {
        const currentCells = this.cells.get(cell) || new Set()
        currentCells.add(objectKey)
        this.cells.set(cell, currentCells)
      }
    } catch (error) {
      console.error(error)
    }
  }

  insert(objectKey: string, objectPosition: LatLong, objectRadius: number) {
    // Find all the H3 cells that intersect with the object
    const nearbyCells = kRingIndexesArea(
      objectPosition,
      objectRadius,
      this.resolution,
    )

    for (const cell of nearbyCells) {
      const currentCells = this.cells.get(cell) || new Set()
      currentCells.add(objectKey)
      this.cells.set(cell, currentCells)
    }
  }

  findObjectsNearPoint(center: LatLong, radius: number): string[] {
    const nearbyCells = kRingIndexesArea(center, radius, this.resolution)

    const resultingKeys = []
    for (const cell of nearbyCells) {
      const keys = this.cells.get(cell)
      if (keys) {
        resultingKeys.push(...keys)
      }
    }
    return resultingKeys
  }

  findObjects(latLong: LatLong): string[] | undefined {
    const h3Index = latLngToCell(latLong.lat, latLong.lon, this.resolution)
    const cell = this.cells.get(h3Index)
    return cell ? Array.from(cell) : undefined
  }

  serialize() {
    return {
      cells: Array.from(this.cells.entries()),
      radius: this.radius,
      resolution: this.resolution,
      sphereOffset: this.sphereOffset.toArray(),
    }
  }

  static deserialize(data: any) {
    const sphereGrid = new SphereGrid(data.radius, data.resolution)
    sphereGrid.cells = new Map(data.cells)
    sphereGrid.sphereOffset.fromArray(data.sphereOffset)
    return sphereGrid
  }
}
