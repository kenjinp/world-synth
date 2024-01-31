import { LatLong } from "@hello-worlds/planets"
import { Billboard, Line, Text } from "@react-three/drei"
import { ThreeEvent } from "@react-three/fiber"
import { latLngToCell } from "h3-js"
import { useMemo, useState } from "react"
import { Color, MathUtils, Vector3 } from "three"
import { UI } from "../../../../tunnel"
import { useGeology } from "./Geology.provider"
import { RESOLUTION } from "./config"

const tempLatLong = new LatLong()

const Arrow: React.FC<{
  position: Vector3
  direction: Vector3
  color: Color
  normal: Vector3
}> = ({ position, direction, color, normal }) => {
  const positions = useMemo(() => {
    const baseWidth = 50_000
    const sideOffset = direction
      .clone()
      .cross(normal)
      .setLength(baseWidth / 2)

    return new Float32Array([
      ...position.clone().add(sideOffset).toArray(),
      ...position.clone().add(direction).toArray(),
      ...position.clone().sub(sideOffset).toArray(),
    ])
  }, [position, direction, normal])

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <meshBasicMaterial color={color} />
      {/* <arrowHelper
        args={[direction, new Vector3(), direction.length(), color]}
      /> */}
    </mesh>
  )
}

export const GeologyDebug: React.FC = () => {
  const geology = useGeology()
  const [hovering, setHover] = useState(false)

  const handleDebugHover = (e: ThreeEvent<PointerEvent>) => {
    const point = e.point

    const latLong = LatLong.cartesianToLatLong(point, tempLatLong)
    const region = geology.getRegionFromVector(point)
    const plate = geology.getPlateFromVector(point)
    const regionDebugDisplay = document.getElementById("debug-region")
    const h3Index = latLngToCell(latLong.lat, latLong.lon, RESOLUTION)

    if (regionDebugDisplay) {
      regionDebugDisplay.style.top = `${e.clientY}px`
      regionDebugDisplay.style.left = `${e.clientX}px`
      if (region) {
        regionDebugDisplay.innerHTML = `
        <div>
        <p>${latLong.lat.toFixed(4)}°, ${latLong.lon.toFixed(4)}°</p>
        <p>
            Region: ${region.id}
          </p>
          <p>
            Plate: ${region.plate?.id} ${plate?.plateType.toLocaleLowerCase()}
          </p>
          <p>
          <p>
           Crust Type: ${region.type}
          </p>
        </div>
        `
      } else {
        regionDebugDisplay.innerHTML = `
        <div>
        <p>${latLong.lat.toFixed(4)}°, ${latLong.lon.toFixed(4)}°</p>
         <p>
            Region: None
          </p>
        </div>
        `
      }
    }
  }

  return (
    <group key={geology.id}>
      <mesh
        visible={false}
        onPointerMove={handleDebugHover}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        <sphereGeometry args={[geology.params.radius, 32, 32]} />
        <meshBasicMaterial wireframe />
      </mesh>
      {hovering && (
        <UI.In>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              background: "black",
              padding: "1em",
            }}
            id="debug-region"
          ></div>
        </UI.In>
      )}

      {Array.from(geology.regions.values()).map(region => {
        const positionLatLong = region.getCenterCoordinates()

        const plate = region.plate!

        const position = positionLatLong.toCartesian(
          geology.params.radius * 1.01,
          new Vector3(),
        )

        const sitePosition = positionLatLong.toCartesian(
          geology.params.radius * 1,
          new Vector3(),
        )

        const movement = plate.calculateMovement(
          position,
          geology.params.radius,
        )

        const color = new Color(MathUtils.seededRandom(plate.id) * 0xffffff)

        return (
          <group key={`arrow-${region.id}`}>
            <Arrow
              position={position}
              direction={movement}
              color={color}
              normal={sitePosition.clone().normalize()}
            />
          </group>
        )
      })}

      {Array.from(geology.plates.values()).map(plate => {
        const positionLatLong = plate.initialRegion.getCenterCoordinates()

        const position = positionLatLong.toCartesian(
          geology.params.radius * 1.2,
          new Vector3(),
        )

        const sitePosition = positionLatLong.toCartesian(
          geology.params.radius * 1,
          new Vector3(),
        )

        const color = new Color(MathUtils.seededRandom(plate.id) * 0xffffff)

        return (
          <group key={plate.id}>
            <mesh>
              <Line
                points={[position, sitePosition]}
                color="white"
                transparent
                dashSize={5_000}
                opacity={0.3}
                lineWidth={4}
              ></Line>
            </mesh>
            <Billboard position={position}>
              <Text
                color={color}
                anchorX="center"
                anchorY="middle"
                fontSize={72}
                outlineWidth={4}
                outlineColor="black"
                scale={5_000}
              >
                Plate {plate.id} ({plate.plateType.toLocaleLowerCase()})
              </Text>
            </Billboard>
          </group>
        )
      })}
    </group>
  )
}
