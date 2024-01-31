import { LatLong } from "@hello-worlds/planets"
import { Vector3 } from "three"
import { SphericalPolygon } from "../../math/SphericalPolygon"

export enum GeologyEventType {
  Generate = "Generate",
  CreatePlates = "CreatePlates",
  CreateContinents = "CreateContinents",
  CreateOceans = "CreateOceans",
  CreateOceanicPlates = "CreateOceanicPlates",
}

export type GeologyEventCallback = (
  geology: IGeology,
  data: { eventType: GeologyEventType; percentDone?: number },
) => void

export interface GeologyParams {
  percentOcean: number
  numberOfInitialPlates: number
  radius: number
  seed?: string
}

export interface IGeology {
  plates: IPlate[]
  regions: IRegion[]
  continents: IContinent[]
  oceans: IOcean[]
  generated: boolean
  params: GeologyParams
  continentShapes: SphericalPolygon
  addPlate: (plate: IPlate) => void
  addRegion: (region: IRegion) => void
  getPlateFromVector: (position: Vector3) => IPlate | undefined
  getRegionFromVector: (position: Vector3) => IRegion | undefined
  generate: VoidFunction
  // getNormalizedElevationAtCoordinate: (latLon: LatLong) => number
  // getElevationAtCoordinate: (latLon: LatLong) => number
  getElevationAtVector: (position: Vector3) => number
  copy: (geology: IGeology) => IGeology
  clone: () => IGeology
  addEventListener: (
    event: GeologyEventType,
    callback: (geology: IGeology) => void,
  ) => void
  removeEventListener: (
    event: GeologyEventType,
    callback: (geology: IGeology) => void,
  ) => void
}

export enum PlateType {
  Oceanic = "Oceanic",
  Continental = "Continental",
  Hybrid = "Hybrid",
}

export interface IRegion {
  id: string
  polygon: SphericalPolygon
  plate?: IPlate
  type?: PlateType
  getArea: () => number
  assignPlate: (plate: IPlate) => void
  getCenterCoordinates: () => LatLong
  getNeighbors: () => IRegion[]
}

export interface IPlate {
  id: number
  regions: IRegion[]
  driftAxis: Vector3
  driftRate: number
  spinRate: number
  shape: SphericalPolygon
  continetalShape: SphericalPolygon
  plateType: PlateType
  initialRegion: IRegion
  plateGrowthBiasBearing: number
  addRegion: (region: IRegion) => void
  getArea: () => number
  getNeighboringRegions: () => IRegion[]
  calculateMovement: (position: Vector3, radius: number) => Vector3
}

export interface IContinent {
  id: string
  regions: IRegion[]
}

export interface IOcean {
  id: string
  regions: IRegion[]
}
