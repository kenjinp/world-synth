import { LatLong } from "@hello-worlds/planets"
import { length, lineString } from "@turf/turf"
import { Vector3 } from "three"
import { MapSet, findAllInSet } from "../../../../../lib/map-set/MapSet"
import { CollisionType, IGeology, IPlate, IRegion } from "../Geology.types"

// Function to calculate the Gaussian distribution
function gaussian(x: number, mean: number, standardDeviation: number): number {
  return (
    Math.exp(-((x - mean) ** 2) / (2 * standardDeviation ** 2)) /
    Math.sqrt(2 * Math.PI * standardDeviation ** 2)
  )
}

// Function to apply Gaussian blur with sliding window
function gaussianBlur(
  input: number[],
  windowSize: number,
  sigma: number,
): number[] {
  const output: number[] = []

  for (let i = 0; i < input.length; i++) {
    let totalWeight = 0
    let weightedSum = 0

    for (let j = -windowSize; j <= windowSize; j++) {
      const index = i + j
      if (index >= 0 && index < input.length) {
        const weight = gaussian(j, 0, sigma) // Calculate Gaussian weight
        weightedSum += input[index] * weight
        totalWeight += weight
      }
    }

    // Normalize the weighted sum by the total weight
    output.push(weightedSum / totalWeight)
  }

  return output
}

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

// An edge between to plates!
export class PlateBoundaryEdge {
  id: string
  next?: string
  prev?: string
  cartA: Vector3 = new Vector3()
  cartB: Vector3 = new Vector3()
  forceA: { pressure: number; shear: number; collisionType: CollisionType } = {
    pressure: 0,
    shear: 0,
    collisionType: CollisionType.Dormant,
  }
  forceB: { pressure: number; shear: number; collisionType: CollisionType } = {
    pressure: 0,
    shear: 0,
    collisionType: CollisionType.Dormant,
  }
  vector: Vector3
  normal: Vector3
  relativeMovement?: Vector3
  #geology: IGeology
  constructor(
    public latLongA: LatLong,
    public latLongB: LatLong,
    public regionA: IRegion,
    public regionB: IRegion,
    geology: IGeology,
  ) {
    this.id = PlateBoundaryEdge.makeKey(latLongA, latLongB)
    const radius = geology.params.radius
    this.cartA = latLongA.toCartesian(radius, this.cartA)
    this.cartB = latLongB.toCartesian(radius, this.cartB)
    this.vector = this.cartA.clone().sub(this.cartB).normalize()
    this.normal = this.cartA.clone().cross(this.cartB).normalize()
    this.#geology = geology
  }

  static makeKey(latLongA: LatLong, latLongB: LatLong) {
    return [
      latLongA.lon.toFixed(5),
      latLongA.lat.toFixed(5),
      ":",
      latLongB.lon.toFixed(5),
      latLongB.lat.toFixed(5),
    ]
      .sort()
      .join("|")
  }

  getLength() {
    const line = lineString([
      [this.latLongA.lon, this.latLongA.lat],
      [this.latLongB.lon, this.latLongB.lat],
    ])
    return length(line, { units: "meters" })
  }
  get length() {
    return this.getLength()
  }

  calculateStress() {
    this.forceA = this.calculateStressAtPoint(this.cartA)
    this.forceB = this.calculateStressAtPoint(this.cartB)
  }

  calculateStressAtPoint(point: Vector3) {
    if (!this.regionA.plate || !this.regionB.plate) {
      throw new Error("Region does not have a plate")
    }
    const movementA = this.regionA.plate.calculateMovement(
      point.clone(),
      this.#geology.params.radius,
    )
    const movementB = this.regionB.plate.calculateMovement(
      point.clone(),
      this.#geology.params.radius,
    )
    const relativeMovement = movementA.clone().sub(movementB)
    this.relativeMovement = relativeMovement
    const pressureVector = relativeMovement.clone().projectOnVector(this.normal)
    let pressure = pressureVector.length()
    if (pressureVector.dot(this.normal) > 0) {
      pressure = -pressure
    }
    let shear = relativeMovement.clone().projectOnVector(this.vector).length()
    const normalize = this.#geology.params.radius / 100
    pressure = 2 / (1 + Math.exp(-pressure / normalize)) - 1
    shear = 2 / (1 + Math.exp(-shear / normalize)) - 1

    let collisionType = CollisionType.Dormant
    const BOUNDARY_PRESSURE_CONSTANT = 0.25

    if (pressure > BOUNDARY_PRESSURE_CONSTANT) {
      collisionType = CollisionType.Convergent
    } else if (pressure < -BOUNDARY_PRESSURE_CONSTANT) {
      collisionType = CollisionType.Divergent
    } else if (shear > BOUNDARY_PRESSURE_CONSTANT) {
      collisionType = CollisionType.Transform
    }

    return {
      collisionType,
      pressure,
      shear,
    }
  }
}

export class PlateBoundary {
  regions = new MapSet<number, IRegion>()
  plates = new Set<IPlate>()
  edges = new Map<string, PlateBoundaryEdge>()
  sortedContiguousEdges = new Set<string[]>()
  danglers: string[] = []
  constructor() {}

  addRegion(region: IRegion, plate: IPlate) {
    this.regions.add(plate.id, region)
    this.plates.add(plate)
  }
  addEdge(regionA: IRegion, regionB: IRegion, geology: IGeology) {
    const edge = regionA.getSharedVertices(regionB)

    // test line length
    // const line = lineString([
    //   [edge[0].lon, edge[0].lon],
    //   [edge[1].lon, edge[1].lat],
    // ])
    // const l = length(line, { units: "meters" })
    // const ratio = l / avgEdgeLengthMeters
    // if (ratio < 0.83) {
    //   console.warn("terrible!", ratio, regionA, regionB)
    //   return
    // }

    const key = PlateBoundaryEdge.makeKey(edge[0], edge[1])
    if (this.edges.has(key)) {
      return
    }
    const edgeInstance = new PlateBoundaryEdge(
      edge[0],
      edge[1],
      regionA,
      regionB,
      geology,
    )
    if (!regionA.plate || !regionB.plate) {
      console.warn(regionA.plate, regionB.plate)
      throw new Error("Region does not have a plate")
    }
    this.addRegion(regionA, regionA.plate)
    this.addRegion(regionB, regionB.plate)
    this.edges.set(key, edgeInstance)
  }

  calculateStress() {
    for (const [, edge] of this.edges) {
      edge.calculateStress()
    }
  }

  blurBoundaryStress() {
    // const windowSize = 3
    // const sigma = 2
    // for (const contiguousEdge of this.sortedContiguousEdges) {
    //   for (let i = 0; i < contiguousEdge.length; i++) {
    //     let totalWeight = 0;
    //     let weightedSum = 0;
    //     for (let j = -windowSize; j <= windowSize; j++) {
    //         const index = i + j;
    //         if (index >= 0 && index < contiguousEdge.length) {
    //             const edge = this.edges.get(contiguousEdge[index])!;
    //             const pressureA = edge.forceA.pressure;
    //             const pressureB = edge.forceB.pressure;
    //             const shearA = edge.forceA.shear;
    //             const shearB = edge.forceB.shear;
    //             const weightPressureA = gaussian(pressureA, 0, sigma);
    //             const weightPressureB = gaussian(pressureB, 0, sigma);
    //             const weightShearA = gaussian(shearA, 0, sigma);
    //             const weightShearB = gaussian(shearB, 0, sigma);
    //             weightedSum += pressureA * weightPressureA;
    //             // totalWeight += weight;
    //         }
    //     }
    //     // Normalize the weighted sum by the total weight
    //     // output.push(weightedSum / totalWeight);
    //   }
    // }
  }

  clone() {
    const newBoundary = new PlateBoundary()
    newBoundary.regions = new MapSet(this.regions)
    newBoundary.plates = new Set(this.plates)
    newBoundary.edges = new Map(this.edges)
    return newBoundary
  }

  calculateContiguousEdges() {
    this.sortedContiguousEdges.clear()

    const createSortedContiguousEdge = (
      remainingEdges: Set<PlateBoundaryEdge>,
    ) => {
      let startingEdge: PlateBoundaryEdge = remainingEdges.values().next().value
      remainingEdges.delete(startingEdge)
      const sortedEdges = [startingEdge.id]

      if (!remainingEdges.size) {
        console.warn("something bad probably happened here, only size of one")
        return sortedEdges
      }

      let currentEdge = startingEdge

      while (remainingEdges.size > 0) {
        const currentStart = currentEdge.latLongA
        const currentEnd = currentEdge.latLongB
        const nextEdges = findAllInSet(remainingEdges, edge => {
          // if b latlong matches current a latlong
          const matchStart = edge.latLongA
          return (
            (matchStart.lat.toFixed(4) === currentEnd.lat.toFixed(4) &&
              matchStart.lon.toFixed(4) === currentEnd.lon.toFixed(4)) ||
            // or if b latlong matches current b latlong
            (matchStart.lat.toFixed(4) === currentStart.lat.toFixed(4) &&
              matchStart.lon.toFixed(4) === currentStart.lon.toFixed(4))
          )
        })
        if (nextEdges.length > 0) {
          if (nextEdges.length > 1) {
            console.warn("more than one edge found in forward pass", nextEdges)
          }
          nextEdges.sort((a, b) => {
            const aLength = a.getLength()
            const bLength = b.getLength()
            return aLength + bLength
          })
          const nextEdge = nextEdges[0]
          sortedEdges.push(nextEdge.id)
          remainingEdges.delete(nextEdge)
          currentEdge.next = nextEdge.id
          currentEdge = nextEdge
        } else {
          break
        }
      }
      currentEdge = startingEdge
      while (remainingEdges.size > 0) {
        const currentStart = currentEdge.latLongA
        const currentEnd = currentEdge.latLongB
        const nextEdges = findAllInSet(remainingEdges, edge => {
          // if b latlong matches current a latlong
          const matchEnd = edge.latLongB
          return (
            (matchEnd.lat.toFixed(4) === currentEnd.lat.toFixed(4) &&
              matchEnd.lon.toFixed(4) === currentEnd.lon.toFixed(4)) ||
            // or if b latlong matches current b latlong
            (matchEnd.lat.toFixed(4) === currentStart.lat.toFixed(4) &&
              matchEnd.lon.toFixed(4) === currentStart.lon.toFixed(4))
          )
        })
        if (nextEdges.length > 0) {
          if (nextEdges.length > 1) {
            console.warn("more than one edge found in backward step", nextEdges)
          }
          nextEdges.sort((a, b) => {
            const aLength = a.getLength()
            const bLength = b.getLength()
            return aLength - bLength
          })
          const nextEdge = nextEdges[0]
          sortedEdges.unshift(nextEdge.id)
          remainingEdges.delete(nextEdge)
          currentEdge.next = nextEdge.id
          currentEdge = nextEdge
        } else {
          break
        }
      }
      return sortedEdges
    }

    const remainingEdges = new Set(this.edges.values())
    const danglers: string[] = []
    while (remainingEdges.size > 0) {
      const sortedEdges = createSortedContiguousEdge(remainingEdges)
      if (sortedEdges.length > 1) {
        this.sortedContiguousEdges.add(sortedEdges)
      } else {
        danglers.push(sortedEdges[0])
      }
    }

    while (danglers.length) {
      const dangler = danglers.shift()
      let found = false
      if (!dangler) {
        break
      }

      const danglerEdge = this.edges.get(dangler)!

      for (const edges of this.sortedContiguousEdges) {
        // check front
        const front = edges[0]
        const frontEdge = this.edges.get(front)!
        if (
          (danglerEdge.latLongB.lon.toFixed(4) ===
            frontEdge.latLongA.lon.toFixed(4) &&
            danglerEdge.latLongB.lat.toFixed(4) ===
              frontEdge.latLongA.lat.toFixed(4)) ||
          (danglerEdge.latLongA.lon.toFixed(4) ===
            frontEdge.latLongA.lon.toFixed(4) &&
            danglerEdge.latLongA.lat.toFixed(4) ===
              frontEdge.latLongA.lat.toFixed(4))
        ) {
          edges.unshift(dangler)
          found = true
          break
        }
        // check back

        const back = edges[edges.length - 1]
        const backEdge = this.edges.get(back)!
        if (
          (danglerEdge.latLongB.lon.toFixed(4) ===
            backEdge.latLongB.lon.toFixed(4) &&
            danglerEdge.latLongB.lat.toFixed(4) ===
              backEdge.latLongB.lat.toFixed(4)) ||
          (danglerEdge.latLongA.lon.toFixed(4) ===
            backEdge.latLongB.lon.toFixed(4) &&
            danglerEdge.latLongA.lat.toFixed(4) ===
              backEdge.latLongB.lat.toFixed(4))
        ) {
          edges.push(dangler)
          found = true
          break
        }
        console.warn("no match inside dangler for loop ", dangler)
      }
      if (!found) {
        this.danglers.push(dangler)
        console.warn("no match in while loop ", danglerEdge, this)
      }
    }
  }

  copy(boundary: PlateBoundary) {
    this.regions = new MapSet(boundary.regions)
    this.plates = new Set(boundary.plates)
    this.edges = new Map(boundary.edges)
    this.sortedContiguousEdges = new Set(boundary.sortedContiguousEdges)
    return this
  }
  static copy(boundary: PlateBoundary) {
    const newBoundary = new PlateBoundary().copy(boundary)
    return newBoundary
  }
  static createKey(plateA: IPlate, plateB: IPlate) {
    return [plateA.id, plateB.id].sort().join("-")
  }
}
