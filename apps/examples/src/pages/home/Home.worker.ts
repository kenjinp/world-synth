import {
  ChunkGenerator3Initializer,
  ColorArrayWithAlpha,
  LatLong,
  createThreadedPlanetWorker,
} from "@hello-worlds/planets"
import { Color } from "three"
import { seededRandom } from "three/src/math/MathUtils"
import { Geology } from "./model/geology/Geology"
import { IGeology, PlateType } from "./model/geology/Geology.types"

export type ThreadParams = {
  seed: string
  geology: IGeology
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

const colorGenerator: ChunkGenerator3Initializer<
  ThreadParams,
  Color | ColorArrayWithAlpha
> = ({ radius, data: { geology, seed } }) => {
  const color = new Color(0xffffff)
  const plateColor = new Color()
  const lerpColor = new Color()

  return ({ worldPosition, height }) => {
    const region = globalGeology.getRegionFromVector(worldPosition)
    const plate = region?.plate
    if (plate && region) {
      plateColor.set(seededRandom(plate.id) * 0xffffff)
      if (region.type === PlateType.Continental) {
        plateColor.lerp(lerpColor.set(0x00ff00), 0.9)
      }
      if (region.type === PlateType.Oceanic) {
        plateColor.lerp(lerpColor.set(0x0000ff), 0.9)
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
