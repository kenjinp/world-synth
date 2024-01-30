import { EARTH_RADIUS, LatLong } from "@hello-worlds/planets"
import { booleanContains, featureCollection, polygon, union } from "@turf/turf"
import { SphereGrid } from "../../../../lib/sphere-grid/SphereGrid"
import { VoronoiPolygon, VoronoiSphere } from "../../math/Voronoi"
import { floodfillPlates } from "./Geology.floodfill"
import { initializeGeology } from "./Geology.initialize"
import { Plate, PlateType } from "./Plate"

const defaultGeologyParams: GeologyParams = {
  percentOcean: 0.71,
  numberOfInitialPlates: 10,
  numberOfVoronoiCells: 700,
  radius: EARTH_RADIUS,
}

export interface GeologyParams {
  percentOcean: number
  numberOfInitialPlates: number
  numberOfVoronoiCells: number
  radius: number
  seed?: string
}

const DEFAULT_SPHERE_GRID_RESOLUTION = 3

export enum GeologyType {
  Oceanic = "Oceanic",
  Continental = "Continental",
}

export type RegionData = { plateIndex: number; type: GeologyType }

export class Geology {
  public voronoiSphere: VoronoiSphere<RegionData>
  public plates: Map<number, Plate> = new Map()
  public geologyParams: GeologyParams
  public oceanPolygon?: ReturnType<typeof union>
  public continentalPolygon?: ReturnType<typeof union>
  // public spatialHash = RTree()

  constructor(geologyParams: Partial<GeologyParams> = {}) {
    console.log("Generating Stuff")
    this.geologyParams = {
      ...defaultGeologyParams,
      ...geologyParams,
    } as GeologyParams

    const {
      radius,
      numberOfVoronoiCells,
      numberOfInitialPlates,
      percentOcean,
      seed,
    } = this.geologyParams
    const resolution = DEFAULT_SPHERE_GRID_RESOLUTION
    const voronoiSphereGrid = new SphereGrid(radius, resolution)
    this.voronoiSphere = new VoronoiSphere(
      numberOfVoronoiCells,
      voronoiSphereGrid,
      seed,
    )

    // initialize geology with some plates
    const { occupiedVoronoiPolygons } = initializeGeology(this)

    // Now that we have the plates, we will grow them randomly
    floodfillPlates(this, occupiedVoronoiPolygons)

    // if there are unassigned regions we assign it to one big ocean plate mimicking the pacific plate
    const intersection = this.voronoiSphere.voronoiPolygons.filter(
      p => !occupiedVoronoiPolygons.has(p),
    )

    if (intersection.length) {
      const remaningRegions = union(
        featureCollection(
          intersection.map(p => polygon(p.geometry.coordinates)),
        ),
      )
      if (remaningRegions) {
        const contiguousGeometries = remaningRegions.geometry.coordinates
        contiguousGeometries.forEach(g => {
          const containingRegions = this.voronoiSphere.voronoiPolygons.filter(
            p => {
              let test
              try {
                test = polygon(g)
              } catch (error) {
                test = polygon([g])
              }
              const target = polygon(p.geometry.coordinates)
              return booleanContains(test, target)
            },
          )
          if (!containingRegions?.length) {
            return
          }
          const initialRegion = containingRegions[0]
          initialRegion.data.type = GeologyType.Oceanic
          const newPlate = new Plate(this.plates.size, containingRegions[0])
          containingRegions.slice(1).forEach(region => {
            newPlate.addRegion(region)
            region.data.type = GeologyType.Oceanic
          })
          newPlate.plateType = PlateType.Oceanic
          this.plates.set(newPlate.index, newPlate)
        })
      }
    }

    for (const plate of this.plates.values()) {
      plate.calculateContinentalPolygon()
    }

    // calculate the ocean polygons for the whole planet
    const oceanPolygons = this.voronoiSphere.voronoiPolygons.filter(
      p => p.data.type === GeologyType.Oceanic,
    )
    const oceanPolygon = union(
      featureCollection(
        oceanPolygons.map(p => polygon(p.geometry.coordinates)),
      ),
    )
    this.oceanPolygon = oceanPolygon

    // calculate the continental polygons for the whole planet
    const continentalPolygons = this.voronoiSphere.voronoiPolygons.filter(
      p => p.data.type === GeologyType.Continental,
    )
    const continentalPolygon = union(
      featureCollection(
        continentalPolygons.map(p => polygon(p.geometry.coordinates)),
      ),
    )
    this.continentalPolygon = continentalPolygon
  }

  getRegionFromPoint(latLong: LatLong) {
    const polygonId = this.voronoiSphere.sphereGrid.findObjects(latLong)
    if (polygonId?.length) {
      return this.voronoiSphere.voronoiPolygons[Number(polygonId[0])]
    }
  }

  static getRegionFromPoint = (geology: Geology, latLong: LatLong) => {
    const polygonId = geology.voronoiSphere.sphereGrid.findObjects(latLong)
    if (polygonId?.length) {
      return geology.voronoiSphere.voronoiPolygons[Number(polygonId[0])]
    }
  }

  getPlateFromPoint(latLong: LatLong) {
    const region = this.getRegionFromPoint(latLong)
    if (region) {
      return Geology.getPlateFromRegion(this, region)
    }
  }

  static getPlateFromPoint = (geology: Geology, latLong: LatLong) => {
    const region = Geology.getRegionFromPoint(geology, latLong)
    if (region) {
      return Geology.getPlateFromRegion(geology, region)
    }
  }

  static getPlateFromRegion(geology: Geology, region: VoronoiPolygon) {
    for (const plate of geology.plates.values()) {
      if (plate.regions.has(region.index)) {
        return plate
      }
    }
    return null
  }

  // static getDistanceToContinentEdge( geology: Geology, latLong: LatLong) {
  //   const plate = Geology.getPlateFromPoint(geology, latLong)
  //   if (plate) {
  //     const distance = getStraightLineDistanceToVoronoiPolygonEdge(
  //       latLong,
  //       plate.continentalPolygon,
  //       geology.geologyParams.radius,
  //     )
  //     return distance
  //   }
  //   return null
  // }

  static getElevationAtPoint = (geology: Geology, latLong: LatLong) => {}
}
