import {
  EARTH_RADIUS,
  Planet as HelloPlanet,
  LatLong,
  fibonacciSphere,
  getRandomBias,
} from "@hello-worlds/planets"
import { OrbitCamera, Planet } from "@hello-worlds/react"
import { useThree } from "@react-three/fiber"
import { Color, MeshPhysicalMaterial, Vector3 } from "three"

import { random, randomRange, setRandomSeed } from "@hello-worlds/core"
import { useControls } from "leva"
import { useMemo, useRef } from "react"
import CustomShaderMaterial from "three-custom-shader-material"
import { ChunkDebugger } from "../../components/ChunkDebugger"
import { SphereGrid } from "../../lib/sphere-grid/SphereGrid"
import Worker from "./Home.worker?worker"
import { Crater } from "./math/crater"

const worker = () => new Worker()
export default () => {
  const camera = useThree(state => state.camera)
  const planet = useRef<HelloPlanet<any>>(null)
  const seed = "plate tectonics example"
  const radius = EARTH_RADIUS
  const { resolution, lineWidth, contourWidth, contourAlpha, subgridAlpha } =
    useControls({
      resolution: {
        value: 3,
        min: 0,
        max: 10,
        step: 1,
      },
      lineWidth: {
        value: 1,
        min: 1,
        max: 10,
      },
      contourAlpha: {
        value: 0,
        min: 0,
        max: 1,
        step: 0.1,
      },
      subgridAlpha: {
        value: 0,
        min: 0,
        max: 1,
        step: 0.1,
      },
      contourWidth: {
        value: 5000,
        min: 500,
        max: 10_0000,
        step: 500,
      },
    })

  const data = useMemo(() => {
    setRandomSeed(seed)
    const tempLatLong = new LatLong()
    const tempVec3 = new Vector3()
    const craterAmount = 10_000
    const jitter = 1
    const sphereGrid = new SphereGrid(radius, resolution)
    // console.time("craters")
    const craters: Crater[] = fibonacciSphere(craterAmount, jitter, random).map(
      (latLong, index) => {
        // console.time(`crater ${index}`)
        const center = latLong
        const radius = getRandomBias(500, 300_000, 1_000, 0.3)

        sphereGrid.insert(index.toString(), center, radius * 2)
        // console.timeEnd(`crater ${index}`)
        return {
          floorHeight: -10,
          radius,
          center,
          rimWidth: randomRange(0.5, 1),
          rimSteepness: randomRange(0.01, 0.8),
          smoothness: randomRange(0.2, 1),
          debugColor: new Color(random() * 0xffffff),
        }
      },
    )
    // console.timeEnd("craters")

    return {
      voronoi: "blah",
      sphereGrid: sphereGrid.serialize(),
      craters,
      seed,
    }
  }, [resolution])

  console.log(data)

  return (
    <group>
      {/* <Text
        position={[0, radius + radius * 0.25, 0]}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontSize={72}
        scale={10000}
      >
        hello world!
      </Text> */}
      <Planet
        ref={planet}
        radius={EARTH_RADIUS}
        minCellSize={2 ** 8}
        minCellResolution={2 ** 6}
        lodOrigin={camera.position}
        worker={worker}
        data={data}
      >
        <CustomShaderMaterial
          vertexColors
          uniforms={{
            uCameraPosition: { value: camera.position },
            uLineWidth: { value: lineWidth },
            uContourWidth: { value: contourWidth },
            uSubgridAlpha: { value: subgridAlpha },
            uContourAlpha: { value: contourAlpha },
          }}
          baseMaterial={MeshPhysicalMaterial}
          vertexShader={
            /* glsl */ `
            varying mat4 vModelMatrix;
            varying vec3 vPosition;
            varying vec2 vUv;

            void main() {
              vPosition = position;
              vModelMatrix = modelMatrix; 
              vUv = uv;
            }

          `
          }
          fragmentShader={
            /* glsl */ `
            varying vec3 vPosition;
            varying mat4 vModelMatrix;
            float radius = ${EARTH_RADIUS}.0;
            uniform vec3 uCameraPosition;
            uniform float uLineWidth;
            uniform float uSubgridAlpha;
            uniform float uContourAlpha;
            uniform float uContourWidth;
            varying vec2 vUv;


            vec3 grid(vec2 p)
            {
                return vec3(1.0)*smoothstep(0.99,1.0,max(sin((p.x)*20.0),sin((p.y)*20.0)));
            }
            
            float remap( in float value, in float x1, in float y1, in float x2, in float y2) {
              return ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
            }

            float RAD2DEG = 180.0 / 3.1415926535897932384626433832795;

            struct LatLong {
              float lat;
              float lon;
            };

            LatLong getLatLong(vec3 position, float radius) {
              float longitude = atan(position.z, position.x) * RAD2DEG;
              float latitude = atan(position.y, length(position.xz)) * RAD2DEG;
              return LatLong(latitude, longitude);
            }

            float getGrid(vec2 localPosition, float size, float thickness) {
              vec2 r = localPosition.xy / size;
              vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
              float line = min(grid.x, grid.y) + 1.0 - thickness;
              return 1.0 - min(line, 1.0);
            }

            float getGridFromFloat(float localPosition, float size, float thickness) {
              float r = localPosition / size;
              float grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
              float line = grid + 1.0 - thickness;
              return 1.0 - min(line, 1.0);
            }

            void main() {
              vec3 wPosition = (vModelMatrix * vec4(vPosition, 1.0)).xyz;
              LatLong latlong = getLatLong(wPosition, radius);
              float lineWidth = uLineWidth;
              vec2 latlongUV = vec2(
                remap(latlong.lat, -90., 90., 0., 1.) * 18.,
                remap(latlong.lon, -180., 180., 0., 1.) * 36.
              );
              
              // float normalizedDistanceToCamera = distance(uCameraPosition, vec3(0.0)) / radius * 10.\
              // ;
              // float nCam = 1.0 - min(normalizedDistanceToCamera, 1.0);

              // contour line stuff
              float contourWidth = uContourWidth;
              float elevationAboveDatum = length(wPosition) - radius;
              float normalizedElevationAboveDatum = elevationAboveDatum / contourWidth;
              float dh = fwidth(normalizedElevationAboveDatum);
              float contourLineWidth = lineWidth * 1.0/sqrt(1.0+dh*dh);
              float contourGrid = getGridFromFloat(normalizedElevationAboveDatum, 1.0, contourLineWidth);

              vec3 color = vColor.xyz;
              
              float grid = getGrid(latlongUV, 1.0, lineWidth);
              float grid2 = getGrid(latlongUV, 0.5, lineWidth) * uSubgridAlpha;
              float grid3 = getGrid(latlongUV, 0.1, lineWidth) * uSubgridAlpha;
              contourGrid *= uContourAlpha;
              float combinedGrid = grid + grid2 + grid3 + contourGrid;

              csm_DiffuseColor = vec4(mix(color, vec3(1.0), combinedGrid), 1.0);
            }
          `
          }
        />
        <ChunkDebugger />
        <OrbitCamera />
      </Planet>
    </group>
  )
}
