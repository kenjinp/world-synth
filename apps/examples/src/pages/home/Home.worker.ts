import {
  ChunkGenerator3Initializer,
  ColorArrayWithAlpha,
  LatLong,
  Noise,
  createThreadedPlanetWorker,
  remap,
} from "@hello-worlds/planets"
import { Color, Vector3 } from "three"
import { seededRandom } from "three/src/math/MathUtils"
import { nooaColorSpline } from "./math/ColorRamp"
import { Geology } from "./model/geology/Geology"

export type ThreadParams = {
  seed: string
  geology: Geology
  showPlateBoundaries: boolean
  showPlateColors: boolean
}

let globalGeology: Geology
const templLatLong = new LatLong(0, 0)
const heightGenerator: ChunkGenerator3Initializer<ThreadParams, number> = ({
  radius,
  data: { seed, geology },
}) => {
  const newGeology = new Geology().copy(geology)
  globalGeology = newGeology
  return ({ input }) => {
    return newGeology.getElevationAtVector(input)
  }
}

function hashStringToInt(input: string): number {
  let hash = 5381 // Initial hash value

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash * 33) ^ char // DJB2 hash algorithm
  }

  return hash >>> 0 // Ensure the result is a non-negative integer
}

const colorGenerator: ChunkGenerator3Initializer<
  ThreadParams,
  Color | ColorArrayWithAlpha
> = ({
  radius,
  data: { geology, seed, showPlateBoundaries, showPlateColors },
}) => {
  const color = new Color(0xffffff * Math.random())
  const plateColor = new Color()
  const regionColor = new Color()
  const lerpColor = new Color()
  const noise = new Noise({
    seed,
    height: 0.5,
    scale: radius / 2,
    octaves: 20,
  })
  const tempVec3 = new Vector3()
  const tempLatLong = new LatLong()
  const ramp = nooaColorSpline

  const jitter = (input: Vector3) => {
    const noiseValue = 1 - noise.getFromVector(input)
    const jittered = tempVec3.copy(input).multiplyScalar(noiseValue)
    return jittered
  }

  console.log({ globalGeology })

  return ({ worldPosition, height }) => {
    const h = remap(height, -1, 1, 0, 1)
    // const latLong = templLatLong.cartesianToLatLong(worldPosition)

    // const longUV = (latLong.lon + 180) / 360
    // const latUV = (latLong.lat + 90) / 180
    // return color.setRGB(longUV, 0, 0)

    // const pos = whateverNoise(worldPosition)
    // const region = globalGeology.getRegionFromLatLong(pos.currentLatLong)
    const region = globalGeology.getRegionFromVector(worldPosition)
    // if (region) {
    //   const c = Region.regionIdAsColor(region.id)
    //   return color.setRGB(c[0], c[1], c[2])
    // }
    // return color
    const plate = region?.plate
    if (plate && region) {
      if (!showPlateColors) {
        plateColor.set(ramp.get(h))
      } else {
        plateColor.set(seededRandom(plate.id) * 0xffffff)
        plateColor.lerp(
          regionColor.set(seededRandom(hashStringToInt(region.id)) * 0xffffff),
          0.5,
        )
        plateColor.lerp(ramp.get(h), 0.8)
        // if (region.type === PlateType.Continental) {
        //   plateColor.lerp(lerpColor.set(0x175515), 0.9)
        // }
        // if (region.type === PlateType.Oceanic) {
        //   plateColor.lerp(lerpColor.set(0x2d75b0), 0.9)
        // }
        if (showPlateBoundaries && plate.borderRegionsIds.has(region.id)) {
          plateColor.lerp(lerpColor.set("red"), 0.6)
        }
      }
      return plateColor
    }
    return color
  }
}

createThreadedPlanetWorker<ThreadParams>({
  heightGenerator,
  colorGenerator,
})
