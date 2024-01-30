import { setRandomSeed } from "@hello-worlds/core"
import { EARTH_RADIUS, LatLong, Noise } from "@hello-worlds/planets"
import { MathUtils, Vector3 } from "three"
import { generate } from "./Geology.generate"
import { GeologyParams } from "./Geology.old"
import {
  GeologyEventCallback,
  GeologyEventType,
  IContinent,
  IGeology,
  IOcean,
  IPlate,
  IRegion,
} from "./Geology.types"
import { Region } from "./Region"

const defaultGeologyParams: Partial<GeologyParams> = {
  percentOcean: 0.71,
  numberOfInitialPlates: 10,
  radius: EARTH_RADIUS,
}

const noise = new Noise({
  seed: "blah",
  height: 100_000,
  scale: EARTH_RADIUS,
  octaves: 20,
})

const smallNoiseMask = new Noise({
  seed: "blah",
  height: 1,
  scale: EARTH_RADIUS,
})

const domainWarpNoise = new Noise({
  seed: "blah".split("").reverse().join(""),
  height: 10,
  scale: EARTH_RADIUS / 10,
})

const terrainNoise = new Noise({
  seed: "blargh",
  height: 8000,
  exponentiation: 1.1,
  scale: EARTH_RADIUS / 10,
})

const tempLatLong = new LatLong()
const tempVec3 = new Vector3()

const whateverNoise = (input: Vector3) => {
  const warp = 1 - domainWarpNoise.getFromVector(input)
  const m = smallNoiseMask.getFromVector(input)
  const t = terrainNoise.getFromVector(input)
  const t2 = 0 //-1000 + terrainNoise2.getFromVector(input)
  const currentLatLong = tempLatLong.cartesianToLatLong(input)
  currentLatLong.set(currentLatLong.lat + warp, currentLatLong.lon + warp)
  const baseHeight = t * m + t2
  let h = baseHeight
  return { h, baseHeight }
}

function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x)
}

export class Geology implements IGeology {
  generated: boolean = false
  params: GeologyParams
  private _plates: Map<number, IPlate> = new Map()
  private _regions: Map<string, IRegion> = new Map()
  private _continents: Map<string, IContinent> = new Map()
  private _oceans: Map<string, IOcean> = new Map()
  private _events: Map<GeologyEventType, Set<GeologyEventCallback>> = new Map()
  constructor(geologyParams: Partial<GeologyParams> = {}) {
    this.params = {
      ...defaultGeologyParams,
      ...geologyParams,
    } as GeologyParams
    setRandomSeed(this.params.seed || MathUtils.generateUUID())
  }

  generate() {
    // create number of plates at random locations
    // form continental crust
    // floodfill to grow plates until we reach a certain percentage of land
    // form oceanic crust
    // floodfill to grow plates until there's nothing in queue
    // form oceanic plates with remaining spaces
    // subdivide plates that are too big

    generate(this, (event, data) => {
      this.#callEvent(GeologyEventType.Generate, {
        eventType: event,
        percentDone: data.percentDone,
      })
      this.#callEvent(event, {
        ...data,
        eventType: event,
      })
    })
    this.generated = true
  }

  addPlate(plate: IPlate) {
    this._plates.set(plate.id, plate)
  }

  addRegion(region: IRegion) {
    this._regions.set(region.id, region)
  }

  #callEvent(
    event: GeologyEventType,
    data: { eventType: GeologyEventType; percentDone: number },
  ) {
    const callbacks = this._events.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(this, data)
      }
    }
  }

  get plates() {
    return Array.from(this._plates.values())
  }

  get regions() {
    return Array.from(this._regions.values())
  }

  get continents() {
    return Array.from(this._continents.values())
  }

  get oceans() {
    return Array.from(this._oceans.values())
  }

  getRegionFromVector(position: Vector3) {
    const latLong = tempLatLong.cartesianToLatLong(position)
    const regionId = Region.getRegionIdFromLatLong(latLong)
    const region = this._regions.get(regionId)
    return region
  }

  getPlateFromLatLong(latLong: LatLong) {
    const regionId = Region.getRegionIdFromLatLong(latLong)
    const region = this._regions.get(regionId)
    return region?.plate
  }

  getPlateFromVector(position: Vector3) {
    const latLong = tempLatLong.cartesianToLatLong(position)
    const regionId = Region.getRegionIdFromLatLong(latLong)
    const region = this._regions.get(regionId)
    return region?.plate
  }

  getNormalizedElevationAtCoordinate(latLon: LatLong) {
    return 0
  }

  getElevationAtCoordinate(latLon: LatLong) {
    return 0
  }

  getElevationAtVector(position: Vector3) {
    let { h, baseHeight } = whateverNoise(position)
    const region = this.getRegionFromVector(position)
    const plate = region?.plate

    // if (region && plate) {
    //   const distanceToCoast = calcDistance(
    //     currentLatLong,
    //     geology.continentalPolygon,
    //   )
    //   const normalizedDistance = distanceToCoast / this.params.radius
    //   const x = easeOutQuad(normalizedDistance)
    //   if (region.type === PlateType.Oceanic) {
    //     h = baseHeight + lerp(0, -8_000, x)
    //     return h
    //   } else {
    //     h = baseHeight + lerp(0, 10_000, x)
    //     return h
    //   }
    // }
    return h
  }

  addEventListener(event: GeologyEventType, callback: GeologyEventCallback) {
    const callbacks = this._events.get(event) || new Set()
    callbacks.add(callback)
    this._events.set(event, callbacks)
  }

  removeEventListener(event: GeologyEventType, callback: GeologyEventCallback) {
    const callbacks = this._events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  copy(geology: IGeology) {
    const {
      _plates: plates,
      _regions: regions,
      _continents: continents,
      _oceans: oceans,
    } = geology as Geology
    this._plates = new Map(Array.from(plates.values()).map(p => [p.id, p]))
    this._regions = new Map(
      Array.from(regions.values()).map(r => [r.id.toString(), r]),
    )
    this._continents = new Map(
      Array.from(continents.values()).map(c => [c.id.toString(), c]),
    )
    this._oceans = new Map(
      Array.from(oceans.values()).map(o => [o.id.toString(), o]),
    )
    this.generated = geology.generated
    return this
  }

  clone(): Geology {
    return new Geology(this.params).copy(this)
  }

  serialize() {
    const clone = this.clone()
    clone._events = new Map()
    return clone
  }
}
