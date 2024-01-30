import { LatLong } from "@hello-worlds/planets"
import { Billboard, Line, Text } from "@react-three/drei"
import { ThreeEvent } from "@react-three/fiber"
import { latLngToCell } from "h3-js"
import { useState } from "react"
import { Color, MathUtils, Vector3 } from "three"
import { UI } from "../../../../tunnel"
import { useGeology } from "./Geology.provider"
import { RESOLUTION } from "./config"

const tempLatLong = new LatLong()
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
    <group>
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

      {/* {Array.from(geology.voronoiSphere.voronoiPolygons.values()).map(
        region => {
          const position = new LatLong(
            region.properties.sitecoordinates[1],
            region.properties.sitecoordinates[0],
          ).toCartesian(geology.geologyParams.radius * 1.05, new Vector3())

          const sitePosition = new LatLong(
            region.properties.sitecoordinates[1],
            region.properties.sitecoordinates[0],
          ).toCartesian(geology.geologyParams.radius * 1, new Vector3())

          const color = new Color(
            MathUtils.seededRandom(region.index) * 0xffffff,
          )

          return (
            <group key={region.index}>
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
                  scale={2_500}
                >
                  Region {region.index}
                </Text>
              </Billboard>
            </group>
          )
        },
      )} */}

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
