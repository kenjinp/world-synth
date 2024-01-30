import { sample } from "@hello-worlds/core"
import { LatLong, Noise } from "@hello-worlds/planets"
import { Vector3 } from "three"
import { VoronoiPolygon } from "../../math/Voronoi"
import { Geology, GeologyType, RegionData } from "./Geology"
import { Plate } from "./Plate"

const latLongA = new LatLong()
const latLongB = new LatLong()
const vecA = new Vector3()
const vecB = new Vector3()

// We'll originate our plates and assign initial values
export const initializeGeology = (geology: Geology) => {
  const { radius, numberOfInitialPlates, percentOcean, seed } =
    geology.geologyParams

  const costNoise = new Noise({
    seed,
    height: 2.0,
    scale: radius,
  })

  const areaEarth = 5.100644719e14
  const areaLandTarget = (1 - percentOcean) * areaEarth
  const occupiedVoronoiPolygons = new Set<VoronoiPolygon<RegionData>>()
  let areaLand = 0

  console.time("create plates")
  // Create the plates
  for (let i = 0; i < numberOfInitialPlates; i++) {
    // get a random voronoi cell
    const initialRegion = sample(geology.voronoiSphere.voronoiPolygons)[0]
    const plate = new Plate(i, initialRegion)
    geology.plates.set(i, plate)
    initialRegion.data.type = GeologyType.Continental
    occupiedVoronoiPolygons.add(initialRegion)

    // Add the area of the initial region to the area of land
    areaLand += plate.getArea()
  }

  let currentAreaAsPercentageOfTarget = areaLand / areaLandTarget

  // Grow the plates in a floodfill until the area of occupied plates covers enough land
  let bigTries = 500_000
  while (currentAreaAsPercentageOfTarget < 1.0 && bigTries > 0) {
    const randomPlate = sample(Array.from(geology.plates.values()))[0]

    const getBestNeighbor = () => {
      const startingRegion = randomPlate.initialRegion

      const calculateCost = (region: VoronoiPolygon) => {
        const [lon, lat] = startingRegion.properties.site.coordinates
        const startingLatLong = latLongA.set(lat, lon)
        const [lon2, lat2] = region.properties.site.coordinates
        const regionLatLong = latLongB.set(lat2, lon2)
        const cart = regionLatLong.toCartesian(radius, vecB)
        const noise = 0.9 - costNoise.getFromVector(cart)
        const distance =
          startingLatLong.toCartesian(radius, vecA).distanceTo(cart) * noise
        return distance
      }

      const allNeighboursIndicies = new Set(
        Array.from(randomPlate.regions.values()).flatMap(region => {
          return region.properties.neighbours
        }),
      )

      const regions = Array.from(allNeighboursIndicies)
        .filter(resolutioIndex => {
          const region = geology.voronoiSphere.voronoiPolygons[resolutioIndex]
          return !occupiedVoronoiPolygons.has(region)
        })
        .map(resolutioIndex => {
          const region = geology.voronoiSphere.voronoiPolygons[resolutioIndex]
          return region
        })
        .sort((a, b) => {
          return calculateCost(a) - calculateCost(b)
        })

      let bestRegion: VoronoiPolygon | null = null
      let chosenRegion: VoronoiPolygon | null = null
      let index = 0
      while (bestRegion === null) {
        chosenRegion = regions[index]
        if (!chosenRegion) {
          return null
        }
        if (!occupiedVoronoiPolygons.has(chosenRegion)) {
          bestRegion = chosenRegion
        }
        index++
      }

      return bestRegion.index
    }

    let randomNeighbor = getBestNeighbor()
    if (!randomNeighbor) {
      bigTries--
      continue
    }

    // grow the plate
    const newRegion = geology.voronoiSphere.voronoiPolygons[randomNeighbor]
    randomPlate.addRegion(newRegion)
    newRegion.data.type = GeologyType.Continental
    occupiedVoronoiPolygons.add(newRegion)

    const areaLand = Array.from(geology.plates.values()).reduce(
      (totalArea, plate) => {
        return totalArea + plate.getArea()
      },
      0,
    )
    currentAreaAsPercentageOfTarget = areaLand / areaLandTarget
    bigTries--
  }
  console.timeEnd("create plates")
  console.log(
    "currentAreaAsPercentageOfTarget",
    currentAreaAsPercentageOfTarget,
  )

  return { occupiedVoronoiPolygons }
}
