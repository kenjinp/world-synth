import {
  ChunkGenerator3Initializer,
  ColorArrayWithAlpha,
  createThreadedPlanetWorker,
  DEFAULT_NOISE_PARAMS,
  LatLong,
  Lerp,
  LinearSpline,
  Noise,
  remap,
} from "@hello-worlds/planets"
import { Color, Line3, Vector3 } from "three"
import { SphereGrid } from "../../lib/sphere-grid/SphereGrid"
import { Crater, craterHeight } from "./math/crater"

export type ThreadParams = {
  seed: string
  sphereGrid: SphereGrid
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
  data: { seed, craters, sphereGrid: _sphereGrid },
}) => {
  sphereGrid = SphereGrid.deserialize(_sphereGrid)
  console.log({ sphereGrid })

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

const colorGenerator: ChunkGenerator3Initializer<
  ThreadParams,
  Color | ColorArrayWithAlpha
> = ({ radius, data: { seed, craters } }) => {
  const colors = createColorSplineFromColorElevation(moonColors)
  const color = new Color(Math.random() * 0xffffff)
  // const color = new Color(0xffffff)
  const tempLatLong = new LatLong()
  const tempLatLongA = new LatLong()
  const tempLatLongB = new LatLong()
  const tempVec3 = new Vector3()
  let max = 0
  return ({ worldPosition, height }) => {
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
