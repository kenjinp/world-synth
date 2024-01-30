import {
  ChunkGenerator3Initializer,
  ColorArrayWithAlpha,
  DEFAULT_NOISE_PARAMS,
  LatLong,
  Lerp,
  LinearSpline,
  Noise,
  createThreadedPlanetWorker,
} from "@hello-worlds/planets"
import { getCoords, lineString, point, pointToLineDistance } from "@turf/turf"
import { Color, Line3, MathUtils, Vector3 } from "three"
import { lerp } from "three/src/math/MathUtils"
import { SphereGrid } from "../../lib/sphere-grid/SphereGrid"
import { noaaRamp } from "./math/ColorRamp"
import { getStraightLineDistanceToVoronoiPolygonEdge } from "./math/Voronoi"
import { Geology, GeologyType } from "./model/geology/Geology"

export type ThreadParams = {
  seed: string
  geology: Geology
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
  data: { seed, geology },
}) => {
  geology.voronoiSphere.sphereGrid = SphereGrid.deserialize(
    geology.voronoiSphere.sphereGrid,
  )

  const terrainNoise = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: 8000,
    exponentiation: 1.1,
    scale: radius / 10,
  })

  const terrainNoise2 = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: 8000 * 3,
    scale: radius / 1,
  })

  const smallNoiseMask = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: 1,
    scale: radius,
  })

  const domainWarpNoise = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed: seed.split("").reverse().join(""),
    height: 10,
    scale: radius / 10,
  })
  const domainWarpNoise2 = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed: seed.split("").reverse().join(""),
    height: 100,
    scale: radius / 10,
  })
  const tempVector3A = new Vector3()

  const tempLatLongA = new LatLong()
  const tempLatLongB = new LatLong()
  const tempVector3B = new Vector3()
  const naiive = false

  function easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x)
  }

  const calcDistance = (p: LatLong, polygon) => {
    if (!polygon) {
      throw new Error("No polygon")
    }
    const polygonEdges = getCoords(polygon)
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

  return ({ input }) => {
    const warp = 1 - domainWarpNoise.getFromVector(input)
    const m = smallNoiseMask.getFromVector(input)
    const t = terrainNoise.getFromVector(input)
    const t2 = 0 //-1000 + terrainNoise2.getFromVector(input)
    const currentLatLong = tempLatLongB.cartesianToLatLong(input)
    currentLatLong.set(currentLatLong.lat + warp, currentLatLong.lon + warp)
    const region = Geology.getRegionFromPoint(geology, currentLatLong)
    const baseHeight = t * m + t2
    let h = baseHeight
    const plate = geology.plates.get(region?.data.plateIndex)
    if (region && plate) {
      const distanceToCoast = calcDistance(
        currentLatLong,
        geology.continentalPolygon,
      )
      const normalizedDistance = distanceToCoast / radius
      const x = easeOutQuad(normalizedDistance)
      if (region.data.type === GeologyType.Oceanic) {
        h = baseHeight + lerp(0, -8_000, x)
        return h
      } else {
        h = baseHeight + lerp(0, 10_000, x)
        return h
      }
    }
    return -10_000
    const latlong = tempLatLongA.cartesianToLatLong(input)
    const voronoiPolygonIds =
      geology.voronoiSphere.sphereGrid.findObjects(latlong)
    if (voronoiPolygonIds?.length) {
      const closestIndex = voronoiPolygonIds[0]
      const numberIndex = Number(closestIndex)
      const polygon = geology.voronoiSphere.voronoiPolygons[numberIndex]
      const plateIndex = polygon.data?.plateIndex
      if (plateIndex) {
        const plate = geology.plates.get(plateIndex)
        if (plate) {
          return getStraightLineDistanceToVoronoiPolygonEdge(
            latlong,
            plate.shape,
            radius,
          )
        }
      }
    } else {
      console.warn("No voronoi polygon found")
    }

    return 0
  }
}

interface ColorElevation {
  color: string
  elevation: number
}

const c = new Color()
const colorLerp: Lerp<THREE.Color> = (
  t: number,
  p0: THREE.Color,
  p1: THREE.Color,
) => {
  return c.lerpColors(p0, p1, t)
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
> = ({ radius, data: { geology, seed } }) => {
  const colors = createColorSplineFromColorElevation(noaaRamp)
  const color = new Color("black")
  const tempLatLong = new LatLong()
  const tempLatLongA = new LatLong()
  const tempLatLongB = new LatLong()
  const tempVec3 = new Vector3()
  let max = 0
  console.log({ geology })
  const height = 1_000_000
  const terrainNoise = new Noise({
    ...DEFAULT_NOISE_PARAMS,
    seed,
    height: height,
    scale: height,
  })

  return ({ worldPosition, height }) => {
    // const blah = colors.get(remap(height, -8000, 8000, 0, 1))
    // return blah
    // let minDistance = Infinity
    // let minPolygon = null
    // for (const polygon of geology.voronoiSphere.voronoiPolygons) {
    //   const midPoints = tempLatLongA
    //     .set(
    //       polygon.properties.sitecoordinates[1],
    //       polygon.properties.sitecoordinates[0],
    //     )
    //     .toCartesian(radius, tempVec3)
    //   let distance = midPoints.distanceTo(worldPosition)
    //   if (distance < minDistance) {
    //     minPolygon = polygon
    //   }
    //   minDistance = Math.min(distance, minDistance)
    //   // const insidePolygon = booleanPointInPolygon([ll.lon, ll.lat], polygon)
    //   // if (insidePolygon) {
    //   //   color.set(MathUtils.seededRandom(polygon.index) * 0xffffff)
    //   //   return color
    //   // }
    // }
    // if (minPolygon) {
    //   color.set(MathUtils.seededRandom(minPolygon.index) * 0xffffff)
    //   // return color
    // }

    // const n = terrainNoise.getFromVector(worldPosition)
    const n = 0
    const newLocation = tempVec3.copy(worldPosition).addScalar(n)
    const currentLatLong = tempLatLong.cartesianToLatLong(newLocation)
    const voronoiPolygonIds =
      geology.voronoiSphere.sphereGrid.findObjects(currentLatLong)
    if (voronoiPolygonIds?.length) {
      if (voronoiPolygonIds.length > 1) {
        color.set("black")
        return color
      }
      const closestIndex = voronoiPolygonIds[0]
      const numberIndex = Number(closestIndex)
      const region = geology.voronoiSphere.voronoiPolygons[numberIndex]
      // const inside = booleanPointInPolygon(
      //   [currentLatLong.lon, currentLatLong.lat],
      //   region,
      // )
      const plate = Geology.getPlateFromRegion(geology, region)
      if (plate) {
        color.set(MathUtils.seededRandom(plate.index) * 0xffffff)
        const plateRegion = plate.regions.get(region.index)
        if (plateRegion?.data.type === GeologyType.Oceanic) {
          color.lerp(new Color(0x0092b2), 0.5)
        } else {
          // color.lerp(new Color("green"), 0.5)
        }
        return color
      }
      color.set(0x0092b2)
    } else {
      console.warn("No voronoi polygon found", currentLatLong.toString())
    }

    return color
  }
}

createThreadedPlanetWorker<ThreadParams>({
  heightGenerator,
  colorGenerator,
})
