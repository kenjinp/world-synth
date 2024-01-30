import { shuffle } from "@hello-worlds/core"
import { Noise } from "@hello-worlds/planets"
import { rhumbBearing } from "@turf/turf"
import { Vector3 } from "three"
import { Queue } from "../../../../lib/queue/Queue"
import { IGeology, IPlate, IRegion } from "./Geology.types"
import { Region } from "./Region"

const vecA = new Vector3()
const vecB = new Vector3()

const NOISE_VALUE = 2.0
const MAX_COST = 1.0

type QueueItem = { region?: IRegion; plate: IPlate }

// We'll originate our plates and assign initial values
export function floodfillPlates(
  geology: IGeology,
  params: {
    noiseValue: number
    maxCost: number
    distanceScoreBias: number
    bearingScoreBias: number
  },
  quitCondition: () => boolean,
  adjustRegion: (region: IRegion, plate: IPlate) => void,
) {
  const costNoise = new Noise({
    height: params.noiseValue,
    scale: geology.params.radius,
  })

  const regionIsAlreadyAssigned = (region: IRegion) =>
    // @ts-ignore
    geology._regions.has(region.id)

  const haveAllRegionsBeenAssigned = () => {
    // @ts-ignore
    return geology._regions.size === Region.getMaxRegions()
  }

  const assignRegionToPlate = (region: IRegion, plate: IPlate) => {
    adjustRegion(region, plate)
    plate.addRegion(region)
    region.assignPlate(plate)
    geology.addRegion(region)
  }

  const costFunction = (region: IRegion, plate: IPlate) => {
    const regionLatLong = region.getCenterCoordinates()
    const cart = regionLatLong.toCartesian(geology.params.radius, vecB)
    const startingRegionLatLong = plate.initialRegion.getCenterCoordinates()
    const noise = costNoise.getFromVector(cart)

    // promote closeness vs distance
    const calculateDistanceScore = () => {
      const cartStart = startingRegionLatLong.toCartesian(
        geology.params.radius,
        vecA,
      )
      const distance = cart.manhattanDistanceTo(cartStart)
      const normalizedDistance = distance / geology.params.radius
      return normalizedDistance
    }

    // promote regions are in the same direction as
    const calculateBiasDirectionScore = () => {
      const desiredBearing = plate.plateGrowthBiasBearing

      const bearing = rhumbBearing(
        [regionLatLong.lon, regionLatLong.lat],
        [startingRegionLatLong.lon, startingRegionLatLong.lat],
      )
      const normalizedBearingDifference =
        Math.abs(bearing - desiredBearing) / 360
      return normalizedBearingDifference
    }

    const distanceScore = calculateDistanceScore()
    const biasDirectionScore = calculateBiasDirectionScore()
    const cost =
      (distanceScore * params.distanceScoreBias +
        biasDirectionScore * params.bearingScoreBias) *
      (1 - noise)
    return cost
  }

  const findNextRegionToAssign = (plate: IPlate) => {
    const nextRegions: { region: IRegion; cost: number }[] = []

    const regionCandidates = plate.getNeighboringRegions()

    for (const region of regionCandidates) {
      if (!regionIsAlreadyAssigned(region)) {
        const cost = costFunction(region, plate)
        if (cost < params.maxCost) {
          nextRegions.push({ region, cost })
        }
      }
    }

    // lower cost first
    const sortedRegions = nextRegions.sort((a, b) => {
      return a.cost - b.cost
    })

    return sortedRegions[0]?.region
  }

  let fronts: Queue<QueueItem>[] = geology.plates.map(
    _ => new Queue<QueueItem>(),
  )

  geology.plates.forEach((plate, index) => {
    // we will prime the fronts with a random neighbor of the plates starting region
    fronts[index].enqueue({
      plate,
      region: findNextRegionToAssign(plate),
    })
  })
  let quitCond = quitCondition()

  // while the fronts still have enqueued Regions to process, we will continue
  while (fronts.reduce((memo, q) => memo || !q.isEmpty, false) && !quitCond) {
    fronts = shuffle<typeof fronts>(fronts)
    for (const front of fronts) {
      const item = front.dequeue()

      if (!item) {
        continue
      }
      const { region, plate } = item
      if (!region) {
        continue
      }
      const isAssigned = regionIsAlreadyAssigned(region)
      if (!isAssigned) {
        assignRegionToPlate(region, plate)
      }

      if (!haveAllRegionsBeenAssigned()) {
        front.enqueue({
          plate,
          region: findNextRegionToAssign(plate),
        })
      }
    }

    quitCond = quitCondition()
  }
}
