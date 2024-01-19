import { LatLong, remap } from "@hello-worlds/planets"
import * as d3 from "d3-geo-voronoi"
import { distanceToGreatCircleLine } from "../../../lib/math/circle"
import { SphereGrid } from "../../../lib/sphere-grid/SphereGrid"

interface VoronoiPolygon {
  geometry: {
    coordinates: [[number, number][]]
    // a list of lines here from start to end
    // test distance to each line
    type: "Polygon"
  }

  properties: {
    neighbors: number[]
    site: {
      coordinates: [number, number]
      type: "Point"
    }
    sitecoordinates: [number, number]
  }
}

const tempLatLongA = new LatLong()
const tempLatLongB = new LatLong()
export const getDistanceToVoronoiPolygonEdge = (
  latLong: LatLong,
  polygon: VoronoiPolygon,
  radius: number,
) => {
  const polygonCoordinatesList = polygon.geometry.coordinates[0]
  let minDistance = Infinity
  for (let i = 0; i < polygonCoordinatesList.length - 1; i++) {
    const [lon1, lat1] = polygonCoordinatesList[i]
    const [lon2, lat2] = polygonCoordinatesList[i + 1]
    const distance = distanceToGreatCircleLine(
      latLong,
      tempLatLongA.set(lat1, lon1),
      tempLatLongB.set(lat2, lon2),
      radius,
    )
    minDistance = Math.min(distance, minDistance)
  }
  return minDistance
}

export class VoronoiSphere {
  voronoiPolygons: VoronoiPolygon[]
  constructor(numberOfPoints: number = 100, public sphereGrid: SphereGrid) {
    const points = {
      type: "FeatureCollection",
      features: new Array(numberOfPoints).fill(0).map(function () {
        return {
          type: "Point",
          coordinates: [
            remap(Math.random(), 0, 1, -180, 180),
            remap(Math.random(), 0, 1, -90, 90),
          ],
        }
      }),
    }

    const features = d3.geoVoronoi()(points).polygons()
      .features as VoronoiPolygon[]

    features.map((feature, index) => {
      // get all the tiles which
      const polygonCoordinatesList = feature.geometry.coordinates[0]
      const polygon = polygonCoordinatesList.map(polygonCoordinate => {
        const [lon, lat] = polygonCoordinate
        const latLong = new LatLong(lat, lon)
        return latLong
      })
      sphereGrid.insertPolygon(index.toString(), polygon)

      return feature
    })

    this.voronoiPolygons = features
  }
}

// export interface GeoFeature {
//   type: "Feature"
//   geometry: {
//     coordinates: [LongLat[]]
//     type: "Polygon"
//   }
//   properties: {
//     neighbours: number[]
//     site: LongLat
//     sitecoodinates: LongLat
//   }
// }

// export interface Region {
//   type: "Feature"
//   geometry: {
//     coordinates: [LongLat[]]
//     vertices: number[]
//     edgeVertices: number[]
//     polygonEdgePoints: Vector3[]
//     // verticesXYZ: Vector3[];
//     type: "Polygon"
//   }
//   properties: {
//     index: number
//     neighbors: number[]
//     site: LongLat
//     siteXYZ: Vector3
//     // TODO
//     // Might need to calculate centroid for like labeling and such
//     // siteCentroidXYZ: Vector3;
//     sitecoodinates: LongLat
//   }
// }

// export type neighbors = number[][]

// // Chop up a sphere into Voronoi Regions
// // Offers a couple of helpful query methods
// export class VoronoiSphere {
//   regions: Region[]
//   neighbors: neighbors
//   constructor(
//     public readonly points: LongLat[],
//     public readonly radius: number,
//   ) {
//     this.regions = convertFeaturesToRegions(
//       d3.geoVoronoi(this.points).polygons(this.points).features as GeoFeature[],
//       radius,
//     )
//     this.neighbors = d3.geoDelaunay(this.points).neighbors
//   }

//   get find() {
//     const findIndex = find(this.neighbors, this.points, this.radius)
//     return {
//       fromPolar: findIndex.findFromPolar,
//       fromCartesian: findIndex.findFromCartesian,
//     }
//   }

//   static createFromFibonacciSphere(
//     numberOfPoints: number,
//     jitter: number,
//     radius: number,
//     random: () => number,
//   ) {
//     return new VoronoiSphere(
//       fibonacciSphere(numberOfPoints, jitter, random),
//       radius,
//     )
//   }
// }
