import { EARTH_RADIUS, Planet as HelloPlanet } from "@hello-worlds/planets"
import { OrbitCamera, Planet } from "@hello-worlds/react"
import { useThree } from "@react-three/fiber"
import { MeshBasicMaterial, MeshStandardMaterial } from "three"

import { setRandomSeed } from "@hello-worlds/core"
import { useControls } from "leva"
import { useMemo, useRef } from "react"
import CustomShaderMaterial from "three-custom-shader-material"
import { ChunkDebugger } from "../../components/ChunkDebugger"
import Worker from "./Home.worker?worker"
import { Geology } from "./model/geology/Geology"
import { GeologyDebug } from "./model/geology/Geology.debug"
import { GeologyProvider } from "./model/geology/Geology.provider"

const worker = () => new Worker()

export default () => {
  const camera = useThree(state => state.camera)
  const planet = useRef<HelloPlanet<any>>(null)
  const radius = EARTH_RADIUS
  const {
    resolution,
    lineWidth,
    contourWidth,
    contourAlpha,
    subgridAlpha,
    numberOfPlates,
    seed,
    useShadows,
  } = useControls({
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
      value: 500,
      min: 500,
      max: 10_0000,
      step: 500,
    },

    numberOfPlates: {
      value: 10,
      min: 1,
      max: 200,
      step: 1,
    },
    seed: "hello world!",
    useShadows: false,
  })
  const memoBuster = JSON.stringify({
    resolution,
    numberOfPlates,
    seed,
  })

  const data = useMemo(() => {
    setRandomSeed(seed)
    const key = memoBuster
    const geology = new Geology({
      seed,
      numberOfInitialPlates: numberOfPlates,
    })
    console.time("Generate Geology")
    geology.generate()
    console.timeEnd("Generate Geology")

    return {
      geology: geology.serialize(),
      seed,
      key,
    }
  }, [memoBuster])

  return (
    <group>
      <Planet
        ref={planet}
        radius={EARTH_RADIUS}
        minCellSize={2 ** 8}
        minCellResolution={2 ** 6}
        lodOrigin={camera.position}
        worker={worker}
        data={data}
      >
        <GeologyProvider geology={data.geology}>
          <CustomShaderMaterial
            vertexColors
            uniforms={{
              uCameraPosition: { value: camera.position },
              uLineWidth: { value: lineWidth },
              uContourWidth: { value: contourWidth },
              uSubgridAlpha: { value: subgridAlpha },
              uContourAlpha: { value: contourAlpha },
            }}
            baseMaterial={useShadows ? MeshStandardMaterial : MeshBasicMaterial}
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
              float latRepititions = 18.;
              float lonRepititions = 36.;
              vec2 latlongUV = vec2(
                remap(latlong.lat, -90., 90., 0., 1.) * latRepititions,
                remap(latlong.lon, -180., 180., 0., 1.) * lonRepititions
              );

              // contour line stuff
              float contourWidth = uContourWidth;
              float elevationAboveDatum = length(wPosition) - radius;
              float normalizedElevationAboveDatum = elevationAboveDatum / contourWidth;
              float dh = fwidth(normalizedElevationAboveDatum);
              float contourLineWidth = lineWidth * 1.0/sqrt(1.0+dh*dh);
              float contourGrid = elevationAboveDatum > 0.0 ? getGridFromFloat(normalizedElevationAboveDatum, 1.0, contourLineWidth) : 0.0;

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
          <GeologyDebug />
          {/* <GeologyProgress /> */}
          {/* <Generate /> */}
        </GeologyProvider>
      </Planet>
    </group>
  )
}
