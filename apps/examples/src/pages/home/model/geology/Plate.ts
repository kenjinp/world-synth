import { randomRange } from "@hello-worlds/core"
import { Vector3 } from "three"
import { IPlate, IRegion, PlateType } from "./Geology.types"
import { Region } from "./Region"

export class Plate implements IPlate {
  readonly initialRegion: IRegion
  private _regions: Map<string, IRegion> = new Map()
  driftAxis: Vector3
  driftRate: number
  spinRate: number
  plateType: PlateType = PlateType.Hybrid
  plateGrowthBiasBearing: number
  #neighbors = new Set<string>()
  constructor(public readonly id: number, initialRegion: IRegion) {
    this.initialRegion = initialRegion
    this.driftRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.spinRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.driftAxis = new Vector3(
      randomRange(-1, 1),
      randomRange(-1, 1),
      randomRange(-1, 1),
    ).normalize()
    this.addRegion(initialRegion)
    this.plateGrowthBiasBearing = randomRange(0, 360)
  }

  get regions() {
    return Array.from(this._regions.values())
  }

  addRegion(region: IRegion) {
    region.assignPlate(this)
    this._regions.set(region.id, region)
    this.assignNeighborsFromRegion(region)
  }

  assignNeighborsFromRegion(region: IRegion) {
    for (const neighbor of region.getNeighbors()) {
      this.#neighbors.add(neighbor.id)
    }
    this.#neighbors.delete(region.id)
  }

  // mergeRegionsIntoPolygon() {
  //   this.shape = SphericalPolygon.fromH3Cells(this.regions.map(r => r.id))
  // }

  getArea() {
    let area = 0
    for (const region of this.regions) {
      area += region.getArea()
    }
    return area
  }

  getNeighboringRegions() {
    return Array.from(this.#neighbors.values()).map(id => Region.getRegion(id))
  }
}
