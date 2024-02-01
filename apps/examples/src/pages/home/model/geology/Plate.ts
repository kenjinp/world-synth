import { randomRange } from "@hello-worlds/core"
import { LatLong } from "@hello-worlds/planets"
import { Vector3 } from "three"
import { MapSet } from "../../../../lib/map-set/MapSet"
import { SphericalPolygon } from "../../math/SphericalPolygon"
import { IPlate, IRegion, PlateType } from "./Geology.types"
import { Region } from "./Region"

export function randomUnitVector() {
  var theta = randomRange(0, Math.PI * 2)
  var phi = Math.acos(randomRange(-1, 1))
  var sinPhi = Math.sin(phi)
  return new Vector3(
    Math.cos(theta) * sinPhi,
    Math.sin(theta) * sinPhi,
    Math.cos(phi),
  )
}

const tempVec3 = new Vector3()
const tempLatLong = new LatLong()
export class Plate implements IPlate {
  readonly initialRegion: IRegion
  private _regions: Map<string, IRegion> = new Map()
  driftAxis: Vector3
  driftRate: number
  spinRate: number
  plateType: PlateType = PlateType.Hybrid
  plateGrowthBiasBearing: number
  shape: SphericalPolygon = new SphericalPolygon()
  continetalShape: SphericalPolygon = new SphericalPolygon()
  #neighbors = new Set<string>()
  borderRegions = new Set<IRegion>()
  neighboringPlates = new Set<IPlate>()
  neighboringRegions = new Set<IRegion>()
  boundaryVertices = new Set<LatLong>()
  neighboringBoundaryRegions = new MapSet<IPlate, IRegion>()
  constructor(public readonly id: number, initialRegion: IRegion) {
    this.initialRegion = initialRegion
    this.driftRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.spinRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.driftAxis = randomUnitVector()
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

  mergeRegionsIntoPolygon() {
    try {
      // this.shape = SphericalPolygon.fromH3Cells(
      //   Array.from(this._regions.keys()),
      // )
      // this tends not to work if the polygon is over the poles
      // so should find a better way
      this.continetalShape = SphericalPolygon.fromH3Cells(
        this.regions
          .filter(r => r.type === PlateType.Continental)
          .map(r => r.id),
      )
      console.log(this, this.continetalShape)
    } catch (error) {
      console.log("failed here", this)
      console.error(error)
    }
  }

  getArea() {
    let area = 0
    for (const region of this.regions) {
      area += region.getArea()
    }
    return area
  }

  getContinentalBorderingRegions() {
    const borderingRegions = new Set<IRegion>()
    for (const r of this._regions.values()) {
      const neighbors = r.getNeighbors()
      for (const neighbor of neighbors) {
        if (
          r.type === PlateType.Continental &&
          neighbor.type === PlateType.Oceanic
        ) {
          borderingRegions.add(r)
          continue
        }
      }
    }
    this.borderRegions = borderingRegions
    return Array.from(borderingRegions)
  }

  getBorderingRegions() {
    const borderingRegions = new Set<IRegion>()
    for (const r of this._regions.values()) {
      const neighbors = r.getNeighbors()
      for (const neighbor of neighbors) {
        if (neighbor.plate && neighbor.plate !== this) {
          // this plate is different than us
          borderingRegions.add(r)
          this.neighboringPlates.add(neighbor.plate)
          this.neighboringBoundaryRegions.add(neighbor.plate, neighbor)
          // get veritces of the neighbor
          // compare with vertices of this region
          // add to list of vertices that are shared
          // const blah = r.getSharedVertices(neighbor)
          // for (const vertex of blah) {
          //   this.boundaryVertices.add(vertex)
          // }
        }
      }
    }
    this.borderRegions = borderingRegions
    // const blah = Array.from(this.boundaryVertices)

    // this.shape.setFromVertices([...blah, blah[0]])
    return Array.from(borderingRegions)
  }

  getNeighboringRegions() {
    return Array.from(this.#neighbors.values()).map(id => Region.getRegion(id))
  }

  getMovementFromPosition(position: Vector3, radius: number) {}

  calculateMovement(
    position: Vector3,
    radius: number,
    drifRateModifier: number = 1,
  ) {
    const movement = this.driftAxis
      .clone()
      .cross(position)
      .setLength(
        this.driftRate *
          drifRateModifier *
          position.clone().projectOnVector(this.driftAxis).distanceTo(position),
      )
    const intialLatLong = this.initialRegion.getCenterCoordinates()
    const initialPosition = intialLatLong.toCartesian(radius, tempVec3)

    movement.add(
      initialPosition
        .clone()
        .cross(position)
        .setLength(
          this.spinRate *
            position
              .clone()
              .projectOnVector(initialPosition)
              .distanceTo(position),
        ),
    )
    return movement
  }

  static copy(plate: IPlate) {
    const initialRegion = Region.copy(plate.initialRegion)
    const newPlate = new Plate(plate.id, initialRegion)
    newPlate.driftAxis = new Vector3().copy(plate.driftAxis)
    newPlate.driftRate = plate.driftRate
    newPlate.spinRate = plate.spinRate
    newPlate.plateType = plate.plateType
    newPlate.plateGrowthBiasBearing = plate.plateGrowthBiasBearing
    newPlate.shape = new SphericalPolygon().copy(plate.shape)
    newPlate.continetalShape = new SphericalPolygon().copy(
      plate.continetalShape,
    )

    newPlate.borderRegions = new Set<IRegion>(plate.borderRegions)
    newPlate.neighboringPlates = new Set<IPlate>(plate.neighboringPlates)
    newPlate.neighboringRegions = new Set<IRegion>(plate.neighboringRegions)
    newPlate.boundaryVertices = new Set<LatLong>(plate.boundaryVertices)

    plate._regions.forEach(r => {
      const region = Region.copy(r)
      newPlate.addRegion(region)
    })

    return newPlate
  }
}
