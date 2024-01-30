import { randomRange } from "@hello-worlds/core"
import { area, featureCollection, polygon } from "@turf/turf"
import { union } from "polyclip-ts"
import { Vector3 } from "three"
import { VoronoiPolygon } from "../../math/Voronoi"
import { GeologyType, RegionData } from "./Geology"

export type Polygon = ReturnType<typeof polygon>
export type ContinentalPolygon = ReturnType<typeof union>
export enum PlateType {
  Oceanic = "Oceanic",
  Continental = "Continental",
  Hybrid = "Hybrid",
}
export class Plate {
  index: number
  regions: Map<number, VoronoiPolygon<RegionData>>
  initialRegion: VoronoiPolygon<RegionData>
  driftAxis: Vector3
  driftRate: number
  spinRate: number
  shape: ReturnType<typeof polygon>
  plateType: PlateType = PlateType.Hybrid
  plateGrowthBiasBearing: number = randomRange(0, 360)
  neighbourRegions: Set<number> = new Set()
  continentalPolygon?: ContinentalPolygon
  constructor(index: number, initialRegion: VoronoiPolygon<RegionData>) {
    this.index = index
    this.initialRegion = initialRegion
    this.regions = new Map()
    this.driftRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.spinRate = randomRange(-Math.PI / 30, Math.PI / 30)
    this.driftAxis = new Vector3(
      randomRange(-1, 1),
      randomRange(-1, 1),
      randomRange(-1, 1),
    ).normalize()
    this.addRegion(initialRegion)
  }

  addRegion(region: VoronoiPolygon) {
    this.regions.set(region.index, region)
    if (!region.properties) {
      console.log(region)
      throw new Error("wtf")
    }

    // add neighbours to the plate
    for (const neighbourIndex of region.properties.neighbours) {
      if (!this.regions.has(neighbourIndex)) {
        this.neighbourRegions.add(neighbourIndex)
      }
    }
    this.regions.forEach(region => {
      this.neighbourRegions.delete(region.index)
    })

    region.data.plateIndex = this.index

    this.mergeRegionIntoPolygon(region)
  }

  calculateContinentalPolygon() {
    const regions = Array.from(this.regions.values())
    const polygons = regions
      .filter(r => r.data.type === GeologyType.Continental)
      .map(r => polygon(r.geometry.coordinates))
    if (polygons.length >= 2) {
      this.continentalPolygon = polygon(
        union(
          featureCollection(polygons).features.map(f => f.geometry.coordinates),
        )[0],
      )
    } else {
      this.continentalPolygon = polygons[0]
    }
  }

  getArea() {
    return area(this.shape)
  }

  // this is very explody
  mergeRegionIntoPolygon(region: VoronoiPolygon<RegionData>) {
    if (!this.shape) {
      this.shape = polygon(region.geometry.coordinates)
      return
    }
    try {
      const merged = union(
        ...[
          this.shape.geometry.coordinates,
          polygon(region.geometry.coordinates).geometry.coordinates,
        ],
      )
      const feature = polygon(merged[0])
      this.shape = feature
    } catch (error) {
      console.error(error)
      console.log(this.shape)
      throw new Error("this method is wayyyy to explode-y")
    }
  }

  mergePolygons() {
    const polygons = Array.from(this.regions.values()).map(p =>
      polygon(p.geometry.coordinates),
    )
    if (polygons.length >= 2) {
      this.shape = union(...polygons)
    } else {
      this.shape = polygons[0]
    }
  }
}
