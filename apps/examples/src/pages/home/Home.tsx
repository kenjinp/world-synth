import { setRandomSeed } from "@hello-worlds/core"
import { useControls } from "leva"
import { useEffect, useMemo } from "react"
import World from "./World"
import { Geology } from "./model/geology/Geology"
import { GeologyDebug } from "./model/geology/Geology.debug"
import { GeologyProvider, useGeology } from "./model/geology/Geology.provider"

const GenerateGeology: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { geology, generated } = useGeology()
  useEffect(() => {
    if (generated) {
      return
    }
    console.time("Generate Geology")
    geology.generate()
    console.timeEnd("Generate Geology")
  }, [geology, generated])
  return children
}

export default () => {
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

  const geology = useMemo(() => {
    setRandomSeed(seed)
    const geology = new Geology({
      seed,
      numberOfInitialPlates: numberOfPlates,
      percentOcean,
      numHotspots: numberOfHotspots,
    })

    return geology
  }, [numberOfPlates, seed, percentOcean, numberOfHotspots])

  return (
    <group>
      <GeologyProvider geology={geology}>
        <World seed={seed}>
          <GeologyDebug />
        </World>
        <GenerateGeology />
      </GeologyProvider>
    </group>
  )
}
