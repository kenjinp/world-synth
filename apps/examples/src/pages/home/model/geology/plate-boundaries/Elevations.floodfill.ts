// from each plate boundary contiguous edge
// find each edge, and assign both neighboring regions
// propogate until all the regions of the plate are assigned
// or until the elevation contribution is 0

import { Queue } from "../../../../../lib/queue/Queue"
import { easeInCirc, saturate } from "../../../math/easings"
import { CollisionType, IGeology, IRegion, PlateType } from "../Geology.types"
import {
  calculateCollidingElevation,
  calculateDormantElevation,
  calculateShearingElevation,
  calculateSubductingElevation,
  calculateSuperductingElevation,
  getT,
} from "./BoundaryElevations"
import { PlateBoundaryEdge } from "./PlateBoundary"

type QueueItem = {
  region: IRegion
  edge: PlateBoundaryEdge
  regionSet: Set<string>
}

const calculateElevationAccordingToForce = (
  region: IRegion,
  edge: PlateBoundaryEdge,
  force: {
    pressure: number
    shear: number
    collisionType: CollisionType
  },
  normalizedDistanceToEdge: number,
) => {
  let elevation = region.elevation
  if (force.collisionType === CollisionType.Convergent) {
    region.lastAffectedBy = CollisionType.Convergent
    const oppositeRegion = edge.getOppositeRegion(region)
    const boundaryElevation =
      Math.max(edge.regionA.elevation, edge.regionB.elevation) +
      saturate(easeInCirc(force.pressure - 0.2))
    if (
      (region.type === PlateType.Oceanic &&
        oppositeRegion.type === PlateType.Continental) ||
      (region.type === PlateType.Oceanic &&
        oppositeRegion.type === PlateType.Continental_Shelf)
    ) {
      region.lastAffectedBy = CollisionType.Subducting
      elevation = calculateSubductingElevation(
        normalizedDistanceToEdge,
        oppositeRegion.elevation,
        boundaryElevation,
        region.elevation,
        force.pressure,
      )
    } else if (
      (region.type === PlateType.Continental &&
        oppositeRegion.type === PlateType.Oceanic) ||
      (region.type === PlateType.Continental_Shelf &&
        oppositeRegion.type === PlateType.Oceanic)
    ) {
      region.lastAffectedBy = CollisionType.Superducting
      elevation = calculateSuperductingElevation(
        normalizedDistanceToEdge,
        oppositeRegion.elevation,
        boundaryElevation,
        region.elevation,
        force.pressure,
      )
    } else {
      region.lastAffectedBy = CollisionType.Convergent
      elevation = calculateCollidingElevation(
        normalizedDistanceToEdge,
        boundaryElevation,
        region.elevation,
      )
    }
  }
  // if (force.collisionType === CollisionType.Divergent) {
  //   region.lastAffectedBy = CollisionType.Divergent
  //   const boundaryElevation =
  //     Math.max(edge.regionA.elevation, edge.regionB.elevation) / 4
  //   elevation = calculateDivergingElevation(
  //     normalizedDistanceToEdge,
  //     boundaryElevation,
  //     region.elevation,
  //   )
  // }
  if (force.collisionType === CollisionType.Transform) {
    region.lastAffectedBy = CollisionType.Transform
    const boundaryElevation =
      Math.max(edge.regionA.elevation, edge.regionB.elevation) +
      easeInCirc(force.shear) / 8
    elevation = calculateShearingElevation(
      normalizedDistanceToEdge,
      boundaryElevation,
      region.elevation,
    )
  }
  if (force.collisionType === CollisionType.Dormant) {
    region.lastAffectedBy = CollisionType.Dormant
    const boundaryElevation =
      (edge.regionA.elevation + edge.regionB.elevation) / 2
    elevation = calculateDormantElevation(
      normalizedDistanceToEdge,
      boundaryElevation,
      region.elevation,
    )
  }

  if (!Number.isFinite(elevation)) {
    throw new Error("elevation is not finite")
  }

  return elevation
}

export function* floodfillElevations(geology: IGeology) {
  yield 0.0

  let i = 0
  for (const [, pb] of geology.plateBoundaries) {
    for (const contiguousEdgeIdList of pb.sortedContiguousEdges) {
      let edgeFronts: Queue<QueueItem>[] = []
      for (const contiguousEdgeId of contiguousEdgeIdList) {
        const contiguousEdge = pb.edges.get(contiguousEdgeId)!
        const front = new Queue<QueueItem>()
        const regionSet = new Set<string>()
        edgeFronts.push(front)
        front.enqueue({
          region: contiguousEdge.regionA,
          edge: contiguousEdge,
          regionSet,
        })
        front.enqueue({
          region: contiguousEdge.regionB,
          edge: contiguousEdge,
          regionSet,
        })
      }

      while (edgeFronts.reduce((memo, q) => memo || !q.isEmpty, false)) {
        for (const front of edgeFronts) {
          const item = front.dequeue()
          if (!item) {
            continue
          }
          const { region, edge, regionSet } = item
          if (!region) {
            continue
          }
          let elevation = region.elevation
          const d = edge.calculateDistanceToRegion(region)
          const dRoot = edge.calculateDistanceToPlateRoot(region)
          const normalizedDistanceToEdge = getT(d, dRoot)
          if (normalizedDistanceToEdge > 0.9) {
            continue
          }

          const elevationA = calculateElevationAccordingToForce(
            region,
            edge,
            edge.forceA,
            normalizedDistanceToEdge,
          )
          const elevationB = calculateElevationAccordingToForce(
            region,
            edge,
            edge.forceB,
            normalizedDistanceToEdge,
          )
          const newElevation = (elevationA + elevationB) / 2
          const elevationDiff = Math.abs(newElevation - elevation)
          region.elevation = newElevation
          regionSet.add(region.id)

          if (elevationDiff < 0.01) {
            continue
          }

          for (const n of region.getNeighbors()) {
            if (n.plate === region.plate && !regionSet?.has(n.id)) {
              front.enqueue({
                region: n,
                edge,
                regionSet,
              })
            }
          }
        }
      }
    }
    let percent = i / geology.plateBoundaries.size
    console.log("done", percent, i, geology.plateBoundaries.size)
    yield percent
    i++
  }
}
