import {
  ChunkGenerator3Initializer,
  ColorArrayWithAlpha,
  DEFAULT_NOISE_PARAMS,
  LatLong,
  Lerp,
  LinearSpline,
  Noise,
  createThreadedPlanetWorker,
  remap,
} from "@hello-worlds/planets"
import { Color, Line3, MathUtils, Vector3 } from "three"
import { SphereGrid } from "../../lib/sphere-grid/SphereGrid"
import { VoronoiSphere, getDistanceToVoronoiPolygonEdge } from "./math/Voronoi"
import { Crater, craterHeight } from "./math/crater"

export type ThreadParams = {
  seed: string
  sphereGrid: SphereGrid
  voronoiSphere: VoronoiSphere
  craters: Crater[]
}

const templLatLong = new LatLong(0, 0)
const tempLine3 = new Line3()
const tempVec3 = new Vector3()
const distanceToSegment = (position: Vector3, a: Vector3, b: Vector3) => {
  const line = tempLine3.set(a, b)
  const d = line
    .closestPointToPoint(position, false, tempVec3)
    .distanceTo(position)

  if (Number.isNaN(d)) {
    throw new Error("NaN distance")
  }

  return d
}
let sphereGrid: SphereGrid
const heightGenerator: ChunkGenerator3Initializer<ThreadParams, number> = ({
  radius,
  data: { seed, craters, sphereGrid: _sphereGrid, voronoiSphere },
}) => {
  sphereGrid = SphereGrid.deserialize(_sphereGrid)
  voronoiSphere.sphereGrid = SphereGrid.deserialize(voronoiSphere.sphereGrid)

  const terrainNoise = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: radius / 10,
    scale: radius,
  })
  const craterNoise = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: 50_000,
    scale: radius / 20,
  })
  const tempVector3A = new Vector3()

  const tempLatLongA = new LatLong()
  const tempLatLongB = new LatLong()
  const tempVector3B = new Vector3()
  const naiive = false

  return ({ input }) => {
    const latlong = tempLatLongA.cartesianToLatLong(input)
    const voronoiPolygonIds = voronoiSphere.sphereGrid.findObjects(latlong)
    if (voronoiPolygonIds?.length) {
      const closestIndex = voronoiPolygonIds[0]
      const numberIndex = Number(closestIndex)
      const polygon = voronoiSphere.voronoiPolygons[numberIndex]
      return getDistanceToVoronoiPolygonEdge(latlong, polygon, radius)
    } else {
      console.warn("No voronoi polygon found")
    }

    return 0

    const terrainNoiseValue = terrainNoise.getFromVector(input)
    let height = terrainNoiseValue
    if (naiive) {
      if (craters?.length) {
        // const craterList = creater.map(key => craters[parseInt(key)])
        // for (const [craterLatitude, craterLongitude, craterRadius] of craters) {
        height += craterHeight(input, craters, radius, craterNoise)
      }
    } else {
      const latLong = tempLatLongA.cartesianToLatLong(input)
      const results = sphereGrid.findObjects(latLong)
      if (results?.length) {
        const craterList = results.map(key => craters[parseInt(key)])
        height += craterHeight(input, craterList, radius, craterNoise)
      }
    }

    // const latLong = LatLong.cartesianToLatLong(input)

    // const h3Index = latLngToCell(latLong.lat, latLong.lon, resolution)

    // // Get the vertices of the hexagon
    // const hexBoundary = cellToBoundary(h3Index)
    // let distance = Infinity
    // for (let i = 0; i < hexBoundary.length; i++) {
    //   const hexBoundaryPoint = hexBoundary[i]
    //   tempLatLongA.set(hexBoundaryPoint[0], hexBoundaryPoint[1])

    //   const a = tempLatLongA.toCartesian(radius, tempVector3A)

    //   let next = hexBoundary[i + 1]

    //   if (!next) {
    //     next = hexBoundary[0]
    //   }

    //   const b = tempLatLongB
    //     .set(next[0], next[1])
    //     .toCartesian(radius, tempVector3B)

    //   const d = distanceToSegment(input, a, b)
    //   distance = Math.min(distance, d)
    // }

    // Add craters
    //   for (const [craterLatitude, craterLongitude, craterRadius] of craters) {
    //     const craterCenter = templLatLong.set(craterLatitude, craterLongitude)
    //     const craterCenterCartesian = craterCenter.toCartesian(
    //       radius,
    //       tempVector3B,
    //     )

    //     const d = craterCenterCartesian.distanceTo(input)
    //     const craterDepth = craterRadius / 10
    //     const craterHeight = craterRadius / 10

    //     if (d < craterRadius) {
    //       // const craterDistance = craterRadius - d
    //       // const craterDepthNoise = craterDepth * terrainNoise.getFromVector(input)
    //       // // const craterHeightNoise =
    //       // //   craterHeight * terrainNoise.getFromVector(input)

    //       // const craterDistanceNoise =
    //       //   craterDistance * terrainNoise.getFromVector(input)

    //       // const craterNoise = craterDistanceNoise + craterDepthNoise
    //       distance = Math.max(
    //         remap(d, 0, craterRadius, craterRadius, 0),
    //         distance,
    //       ) //Math.min(distance, craterNoise)
    //     }
    //   }

    return height
  }
  // return terrainNoise.getFromVector(input)
}

interface ColorElevation {
  color: string
  elevation: number
}

const moonColors: ColorElevation[] = [
  { color: "#595959", elevation: 0.0 }, // Light Gray
  { color: "#808080", elevation: 0.1 }, // Medium Gray
  { color: "#a0a0a0", elevation: 0.2 }, // Lighter Gray
  { color: "#bfbfbf", elevation: 0.4 }, // Very Light Gray
  { color: "#d9d9d9", elevation: 0.6 }, // Lunar Highlands
  { color: "#ffffff", elevation: 0.8 }, // Bright Peaks
]

const colorLerp: Lerp<THREE.Color> = (
  t: number,
  p0: THREE.Color,
  p1: THREE.Color,
) => {
  const c = p0.clone()
  return c.lerp(p1, t)
}

function createColorSplineFromColorElevation(colorElevation: ColorElevation[]) {
  const colorSpline = new LinearSpline<Color>(colorLerp)
  colorElevation.forEach(({ color, elevation }) => {
    colorSpline.addPoint(elevation, new Color(color))
  })
  return colorSpline
}

function calculateSphericalDistance(
  latlong1: LatLong,
  latlong2: LatLong,
): number {
  const lat1 = latlong1.lat
  const lon1 = latlong1.lon
  const lat2 = latlong2.lat
  const lon2 = latlong2.lon
  const earthRadius = 6371 // Radius of the Earth in kilometers

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180
  const lon1Rad = (lon1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const lon2Rad = (lon2 * Math.PI) / 180

  // Haversine formula
  const dLat = lat2Rad - lat1Rad
  const dLon = lon2Rad - lon1Rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Calculate the distance in kilometers
  const distance = earthRadius * c

  return distance
}

const colorGenerator: ChunkGenerator3Initializer<
  ThreadParams,
  Color | ColorArrayWithAlpha
> = ({ radius, data: { voronoiSphere } }) => {
  const colors = createColorSplineFromColorElevation(moonColors)
  const color = new Color("blue")
  const tempLatLong = new LatLong()
  const tempLatLongA = new LatLong()
  const tempLatLongB = new LatLong()
  const tempVec3 = new Vector3()
  let max = 0

  return ({ worldPosition, height }) => {
    const currentLatLong = tempLatLong.cartesianToLatLong(worldPosition)
    const voronoiPolygonIds =
      voronoiSphere.sphereGrid.findObjects(currentLatLong)
    if (voronoiPolygonIds?.length) {
      const closestIndex = voronoiPolygonIds[0]
      const numberIndex = Number(closestIndex)
      // const polygon = voronoiSphere.voronoiPolygons[numberIndex]
      return color.set(MathUtils.seededRandom(numberIndex) * 0xffffff)
    } else {
      console.warn("No voronoi polygon found")
    }

    // voronoiSphere.voronoiPolygons.sort((a, b) => {
    //   const aDistance = calculateSphericalDistance(
    //     tempLatLongA.set(
    //       a.properties.site.coordinates[1],
    //       a.properties.site.coordinates[0],
    //     ),
    //     currentLatLong,
    //   )
    //   const bDistance = calculateSphericalDistance(
    //     tempLatLongB.set(
    //       b.properties.site.coordinates[1],
    //       b.properties.site.coordinates[0],
    //     ),
    //     currentLatLong,
    //   )
    //   return aDistance - bDistance
    // })

    // const closestRNG = MathUtils.seededRandom(
    //   voronoiSphere.voronoiPolygons[0].properties.site.coordinates[0] +
    //     voronoiSphere.voronoiPolygons[0].properties.site.coordinates[1],
    // )
    // const closestColor = color.set(closestRNG * 0xffffff)
    // return closestColor

    return colors.get(remap(height, 0, 2_000_000, 0, 1))

    const latLong = tempLatLong.cartesianToLatLong(worldPosition)
    const results = sphereGrid.findObjects(latLong)

    if (results?.length) {
      max = Math.max(max, results.length)
      const colorR = remap(results.length, 0, max, 0, 1)
      const colorB = remap(results.length, 0, max, 1, 0)
      return [colorR, 0, colorB, 1]
      // const sortedCraterList = []
      // for (const index in results) {
      //   const crater = craters[parseInt(index)]
      //   sortedCraterList.push(crater)

      //   // const craterCenter = tempLatLong
      //   //   .set(crater.center.lat, crater.center.lon)
      //   //   .toCartesian(radius, tempVec3)
      //   // const d = worldPosition.distanceTo(craterCenter)
      //   // if (d < crater.radius) {
      //   //   color.set(crater.debugColor)
      //   //   return color
      //   // }
      //   // color.copy(crater.debugColor)
      //   // color.copy(crater.debugColor)
      //   // color.set("red")
      //   // //  color.set(crater.debugColor)
      //   // return color
      // }
      // sortedCraterList.sort((a, b) => {
      //   const aDistance = tempLatLongA.copy(a.center).distanceTo(latLong)
      //   const bDistance = tempLatLongB.copy(b.center).distanceTo(latLong)
      //   return aDistance - bDistance
      // })
      // const closestCrater = sortedCraterList[0]
      // return [...color.copy(closestCrater.debugColor).toArray(), 0]

      // return color
    } else {
      color.set(0xffffff)
    }
    return color
  }
}

createThreadedPlanetWorker<ThreadParams>({
  heightGenerator,
  colorGenerator,
})
