import { MapSet } from "../../../../../lib/map-set/MapSet"
import { IPlate, IRegion } from "../Geology.types"

// Divergent:
//   Spreading center
//   Extension zone
// Convergent:
//   Subduction zone
//   Collision zone
// Transform:
//   Dextral transform
//   Sinistral transform

// export enum PlateBoundaryType {
//   Divergent = "Divergent",
//   Convergent = "Convergent",
//   Transform = "Transform",
// }

// Lets First define the plat boundaries
// then we can define region's age (from expanding regions)
// or the age from their furthest point

// Cool oceanic lithosphere is significantly denser than the hot mantle material from which it is derived and so with increasing thickness it gradually subsides into the mantle to compensate the greater load.
// The result is a slight lateral incline with increased distance from the ridge axis.

// Trenches

// Hotspots

export class PlateBoundary {
  regions = new MapSet<number, IRegion>()
  plates = new Set<IPlate>()
  constructor() {}
}
