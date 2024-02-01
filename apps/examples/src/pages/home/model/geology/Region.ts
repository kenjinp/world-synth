import { randomRange } from "@hello-worlds/core"
import { LatLong } from "@hello-worlds/planets"
import {
  UNITS,
  cellArea,
  cellToLatLng,
  cellToVertexes,
  getNumCells,
  gridDisk,
  isValidCell,
  latLngToCell,
  vertexToLatLng,
} from "h3-js"
import { Vector3 } from "three"
import { SphericalPolygon } from "../../math/SphericalPolygon"
import { IPlate, IRegion, PlateType } from "./Geology.types"
import { RESOLUTION } from "./config"

const regionMap = new Map<string, Region>()
const tempLatLong = new LatLong()
const tempVec3 = new Vector3()
export class Region implements IRegion {
  public readonly polygon: SphericalPolygon
  public plate: IPlate | undefined
  public type?: PlateType
  constructor(public readonly id: string) {
    if (!isValidCell(id)) {
      throw new Error("Invalid cell id, must be a valid h3 cell")
    }
    this.polygon = SphericalPolygon.fromH3Cell(id)
  }

  assignPlate(plate: IPlate) {
    this.plate = plate
  }

  getVertices() {
    const vertexIds = cellToVertexes(this.id)
    const vertices = []
    for (const vertexId of vertexIds) {
      const [lat, long] = vertexToLatLng(vertexId)
      vertices.push(new LatLong(lat, long))
    }
    return vertices
  }

  getSharedVertices(region: IRegion) {
    const vertexIdsA = cellToVertexes(this.id)
    const vertexIdsB = cellToVertexes(region.id)
    const sharedVertexIds = vertexIdsA.filter(id => vertexIdsB.includes(id))
    const sharedVertices = []
    for (const vertexId of sharedVertexIds) {
      const [lat, long] = vertexToLatLng(vertexId)
      sharedVertices.push(new LatLong(lat, long))
    }
    return sharedVertices
  }

  getArea() {
    return cellArea(this.id, UNITS.m2)
  }

  getCenterCoordinates() {
    const [lat, lon] = cellToLatLng(this.id)
    return new LatLong(lat, lon)
  }

  getNeighborIds() {
    return gridDisk(this.id, 1)
  }

  getNeighbors() {
    const neighbors = []
    for (const neighborId of this.getNeighborIds()) {
      neighbors.push(Region.getRegion(neighborId))
    }
    return neighbors
  }

  static getRegionIdFromLatLong(latLong: LatLong) {
    return latLngToCell(latLong.lat, latLong.lon, RESOLUTION)
  }

  static getNewRegionFromLatLong(latLong: LatLong) {
    return Region.getRegion(Region.getRegionIdFromLatLong(latLong))
  }

  static getRandomRegion() {
    const randomVector = tempVec3
      .set(randomRange(-1, 1), randomRange(-1, 1), randomRange(-1, 1))
      .normalize()
    const latLong = tempLatLong.cartesianToLatLong(randomVector)
    return Region.getRegion(Region.getRegionIdFromLatLong(latLong))
  }

  static getMaxRegions() {
    return getNumCells(RESOLUTION)
  }

  static getRegion(id: string) {
    let region = regionMap.get(id)
    if (!region) {
      region = new Region(id)
      regionMap.set(id, region)
    }
    return region
  }

  static copy(region: IRegion) {
    const r = Region.getRegion(region.id)
    r.type = region.type
    r.plate = region.plate
    return r
  }
}
