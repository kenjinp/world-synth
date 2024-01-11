import { LatLong } from "@hello-worlds/planets"
import { latLngToCell } from "h3-js"
import { Vector3 } from "three"
import { kRingIndexesArea } from "./h3-utils"

export class SphereGrid {
  private cells: Map<string, string[]> = new Map()
  private radius: number
  private resolution: number
  private sphereOffset: Vector3 = new Vector3()

  constructor(radius: number, resolution: number, sphereOffset?: Vector3) {
    this.radius = radius
    this.resolution = resolution
    this.sphereOffset = sphereOffset || this.sphereOffset
  }

  insert(objectKey: string, objectPosition: LatLong, objectRadius: number) {
    // Find all the H3 cells that intersect with the object
    const nearbyCells = kRingIndexesArea(
      objectPosition,
      objectRadius,
      this.resolution,
    )

    for (const cell of nearbyCells) {
      const currentCells = this.cells.get(cell) || []
      if (currentCells.includes(objectKey)) {
        continue
      }
      currentCells.push(objectKey)
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

  findObjects(center: LatLong): string[] | undefined {
    const h3Index = latLngToCell(center.lat, center.lon, this.resolution)
    const cell = this.cells.get(h3Index)
    return cell
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
