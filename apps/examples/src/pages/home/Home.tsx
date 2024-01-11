import {
  EARTH_RADIUS,
  Planet as HelloPlanet,
  LatLong,
  fibonacciSphere,
  getRandomBias,
} from "@hello-worlds/planets"
import { OrbitCamera, Planet } from "@hello-worlds/react"
import { useThree } from "@react-three/fiber"
import { Color, Vector3 } from "three"

import { random, randomRange, setRandomSeed } from "@hello-worlds/core"
import { useMemo, useRef } from "react"
import { SphereGrid } from "../../lib/sphere-grid/SphereGrid"
import Worker from "./Home.worker?worker"
import { Crater } from "./math/crater"

const worker = () => new Worker()
export default () => {
  const camera = useThree(state => state.camera)
  const planet = useRef<HelloPlanet<any>>(null)
  const seed = "plate tectonics example"
  const radius = EARTH_RADIUS

  const data = useMemo(() => {
    setRandomSeed(seed)
    const tempLatLong = new LatLong()
    const tempVec3 = new Vector3()
    const craterAmount = 5_000
    const jitter = 1
    const resolution = 3
    const sphereGrid = new SphereGrid(radius, resolution)
    console.time("craters")
    const craters: Crater[] = fibonacciSphere(craterAmount, jitter, random).map(
      (latLong, index) => {
        console.time(`crater ${index}`)
        const center = latLong
        const radius = getRandomBias(500, 300_000, 1_000, 0.3)

        sphereGrid.insert(index.toString(), center, radius * 3)
        console.timeEnd(`crater ${index}`)
        return {
          floorHeight: 0,
          radius,
          center,
          rimWidth: randomRange(0.5, 1),
          rimSteepness: randomRange(0.01, 0.8),
          smoothness: randomRange(0.2, 1),
          debugColor: new Color(random() * 0xffffff),
        }
      },
    )
    console.timeEnd("craters")

    return {
      voronoi: "blah",
      sphereGrid: sphereGrid.serialize(),
      craters,
      seed,
    }
  }, [])

  console.log(data)

  return (
    <group
    // Rotate World so it's along the x axis
    >
      <Planet
        ref={planet}
        radius={EARTH_RADIUS}
        minCellSize={2 ** 8}
        minCellResolution={2 ** 6}
        lodOrigin={camera.position}
        worker={worker}
        data={data}
      >
        <meshStandardMaterial vertexColors />
        <OrbitCamera />
      </Planet>
    </group>
  )
}
