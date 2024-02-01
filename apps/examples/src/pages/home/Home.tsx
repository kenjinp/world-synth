import { EARTH_RADIUS } from "@hello-worlds/planets"
import { useControls } from "leva"
import { useMemo } from "react"
import World from "./World"
import { GeologyDebug } from "./model/geology/Geology.debug"
import { GeologyProgress } from "./model/geology/Geology.progress"
import { GeologyProvider } from "./model/geology/Geology.provider"

export default () => {
  const radius = EARTH_RADIUS
  const { resolution, numberOfHotspots, numberOfPlates, seed, percentOcean } =
    useControls({
      numberOfHotspots: {
        value: 36,
        min: 1,
        max: 100,
        step: 1,
      },
      resolution: {
        value: 3,
        min: 0,
        max: 10,
        step: 1,
      },
      numberOfPlates: {
        value: 10,
        min: 1,
        max: 200,
        step: 1,
      },
      percentOcean: {
        value: 0.71,
        min: 0,
        max: 1,
        step: 0.01,
      },
      seed: "hello world!",
      useShadows: false,
    })

  const params = useMemo(() => {
    return {
      seed,
      numberOfInitialPlates: numberOfPlates,
      percentOcean,
      numHotspots: numberOfHotspots,
      radius,
    }
  }, [numberOfPlates, seed, percentOcean, numberOfHotspots, radius])

  return (
    <GeologyProvider {...params}>
      <World seed={seed}>
        <GeologyDebug />
      </World>
      <GeologyProgress />
    </GeologyProvider>
  )
}
