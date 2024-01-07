import { BoxGeometryProps, type Vector3 } from "@react-three/fiber"
import { FC, useRef } from "react"
import { useSun } from "../../hooks/use-sun"
import { WaterMaterial } from "./Water.material"

export const Ocean: FC<{
  position: Vector3
  size: BoxGeometryProps["args"]
}> = ({ position = [0, 0, 0], size = [10, 1, 10] }) => {
  const light = useSun()
  const ref = useRef<THREE.Mesh>(null)

  return (
    <>
      (light ? (
      <mesh ref={ref} position={position} receiveShadow>
        <boxGeometry args={size} />
        {ref.current && (
          <WaterMaterial sunPosition={light.position} mesh={ref.current} />
        )}
      </mesh>
      ) : null)
      <directionalLight
        position={[-2.52, 4.26, -8.24]}
        name={"sun-shadow"}
        color={"#ffffff"}
        receiveShadow={false}
        castShadow={true}
        intensity={2}
      />
      <mesh name={"Test Box"} position={[2.98, 0.42, -0.16]} visible={true}>
        <boxGeometry />
      </mesh>
    </>
  )
}
