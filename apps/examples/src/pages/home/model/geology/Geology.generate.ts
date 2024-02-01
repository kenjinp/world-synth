import { AREA_EARTH } from "../../math/earth"
import { floodfillPlates } from "./Geology.floodfill"
import { GeologyEventType, IGeology, PlateType } from "./Geology.types"
import { Plate } from "./Plate"
import { Region } from "./Region"
import { Hotspot } from "./hotspots/Hotspot"

export function generate(
  geology: IGeology,
  callEvent: (event: GeologyEventType, data: { percentDone: number }) => void,
) {
  const createPlatesIterator = createPlates(geology)
  const createContinentalCrustIterator = createContinentalCrust(geology)
  const createOceanicCrustIterator = createOceanicCrust(geology)
  const createOceanicPlatesIterator = createOceanicPlates(geology)
  const createTectonicBoundariesIterator = createTectonicBoundaries(geology)
  const createHotspotsIterator = createHotspots(geology)

  function doIterator(
    iterator: Generator<any, any, any>,
    event: GeologyEventType,
  ) {
    let next
    while (!next?.done) {
      next = iterator.next()
      callEvent(event, { percentDone: next.value as number })
    }
  }

  doIterator(createPlatesIterator, GeologyEventType.CreatePlates)
  doIterator(createContinentalCrustIterator, GeologyEventType.CreateContinents)
  doIterator(createOceanicCrustIterator, GeologyEventType.CreateOceans)
  doIterator(createOceanicPlatesIterator, GeologyEventType.CreateOceanicPlates)
  doIterator(
    createTectonicBoundariesIterator,
    GeologyEventType.CreateOceanicPlates,
  )
  doIterator(createHotspotsIterator, GeologyEventType.CreateHotspots)
}

function* createPlates(geology: IGeology) {
  // number of plates
  for (let i = 0; i < geology.params.numberOfInitialPlates; i++) {
    const percentDone = i / geology.params.numberOfInitialPlates

    const initialRegion = Region.getRandomRegion()
    initialRegion.type = PlateType.Continental
    const plate = new Plate(i, initialRegion)
    geology.addRegion(initialRegion)
    geology.addPlate(plate)

    yield percentDone
  }
}

function* createContinentalCrust(geology: IGeology) {
  // grow crust until we reach a certain percentage of land
  let timeStart = performance.now()
  let currentTime = timeStart
  let lastTime = timeStart
  let currentAreaAsPercentageOfTarget
  const iterator = floodfillPlates(
    geology,
    {
      noiseValue: 2.0,
      maxCost: 1.0,
      distanceScoreBias: 0.7,
      bearingScoreBias: 0.6,
    },
    function quitCondition() {
      const areaLandTarget = (1 - geology.params.percentOcean) * AREA_EARTH
      const areaLand = geology.plates.reduce(
        (acc, plate) => acc + plate.getArea(),
        0,
      )
      currentAreaAsPercentageOfTarget = areaLand / areaLandTarget
      lastTime = currentTime
      currentTime = performance.now()
      // const timeDiff = currentTime - lastTime
      // if (timeDiff > 2_000) {
      //   throw new Error("Continent generation took too long!")
      // }
      return currentAreaAsPercentageOfTarget >= 1.0
    },
    region => {
      region.type = PlateType.Continental
    },
  )
  yield 1.0

  // let iterate = iterator.next()
  // let tries = 0
  // while (!iterate.done) {
  //   yield currentAreaAsPercentageOfTarget // do some calculation here
  //   iterate = iterator.next()
  //   tries++
  // }
}

function* createOceanicCrust(geology: IGeology) {
  // grow crust until we reach a certain percentage of land
  let timeStart = performance.now()
  let currentTime = timeStart
  let lastTime = timeStart
  const iterator = floodfillPlates(
    geology,
    {
      noiseValue: 2.0,
      maxCost: 1.2,
      distanceScoreBias: 0.25,
      bearingScoreBias: 1.0,
    },
    function quitConditionOceanCrust() {
      lastTime = currentTime
      currentTime = performance.now()
      const timeDiff = currentTime - lastTime
      // console.log("createOceanicCrust timeDiff", timeDiff)
      // if (currentTime - timeStart > 2_000) {
      //   throw new Error("Continent generation took too long!")
      // }

      return false
    },
    region => {
      region.type = PlateType.Oceanic
    },
  )
  yield 1.0

  // let iterate = iterator.next()
  // let tries = 0
  // while (!iterate.done) {
  //   yield 0.1 // do some calculation here
  //   iterate = iterator.next()
  //   tries++
  // }
}

function* createOceanicPlates(geology: IGeology) {
  // number of plates
  for (let i = 0; i < geology.params.numberOfInitialPlates; i++) {
    const percentDone = i / geology.params.numberOfInitialPlates
    yield percentDone
  }
}

function* createTectonicBoundaries(geology: IGeology) {
  for (const plate of geology.plates) {
    const percentDone = plate.id / geology.plates.length
    // @ts-ignore
    plate.getBorderingRegions()
    yield percentDone
  }
}

function* createHotspots(geology: IGeology) {
  for (let i = 0; i < geology.params.numHotspots; i++) {
    const percentDone = i + 1 / geology.params.numHotspots
    const hotspot = Hotspot.random(geology)
    // hotspot.calculateChainEffect()
    geology.hotspots.push(hotspot)

    yield percentDone
  }
}
