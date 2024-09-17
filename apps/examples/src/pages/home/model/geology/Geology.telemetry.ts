import { IGeology } from "./Geology.types"

export const printPressureTelemetry = (geology: IGeology) => {
  let pressures = []
  let pressuresTotal = 0
  let minPressure = Infinity
  let maxPressure = -Infinity
  let shears = []
  let shearsTotal = 0
  let minShear = Infinity
  let maxShear = -Infinity

  for (const [, pb] of geology.plateBoundaries) {
    for (const contiguousEdgeIdList of pb.sortedContiguousEdges) {
      for (const contiguousEdgeId of contiguousEdgeIdList) {
        const contiguousEdge = pb.edges.get(contiguousEdgeId)!
        pressures.push(contiguousEdge.forceA.pressure)
        pressures.push(contiguousEdge.forceB.pressure)
        pressuresTotal += contiguousEdge.forceA.pressure
        pressuresTotal += contiguousEdge.forceB.pressure
        shears.push(contiguousEdge.forceA.shear)
        shears.push(contiguousEdge.forceB.shear)
        shearsTotal += contiguousEdge.forceA.shear
        shearsTotal += contiguousEdge.forceB.shear
        minPressure = Math.min(
          minPressure,
          contiguousEdge.forceA.pressure,
          contiguousEdge.forceB.pressure,
        )
        maxPressure = Math.max(
          maxPressure,
          contiguousEdge.forceA.pressure,
          contiguousEdge.forceB.pressure,
        )
        minShear = Math.min(
          minShear,
          contiguousEdge.forceA.shear,
          contiguousEdge.forceB.shear,
        )
        maxShear = Math.max(
          maxShear,
          contiguousEdge.forceA.shear,
          contiguousEdge.forceB.shear,
        )
      }
    }
  }

  console.table({
    pressuresTotal,
    minPressure,
    maxPressure,
    pressuresAverage: pressuresTotal / pressures.length,
    shearsTotal,
    minShear,
    maxShear,
    shearsAverage: shearsTotal / shears.length,
  })
}
