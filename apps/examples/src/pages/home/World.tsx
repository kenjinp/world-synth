import { EARTH_RADIUS, Planet as HelloPlanet } from "@hello-worlds/planets"
import { OrbitCamera, Planet } from "@hello-worlds/react"
import { useThree } from "@react-three/fiber"
import { MeshBasicMaterial, MeshStandardMaterial } from "three"

import { useControls } from "leva"
import { useMemo, useRef } from "react"
import CustomShaderMaterial from "three-custom-shader-material"
import { ChunkDebugger } from "../../components/ChunkDebugger"
import Worker from "./Home.worker?worker"
import { useGeology } from "./model/geology/Geology.provider"

const worker = () => new Worker()

const World: React.FC<React.PropsWithChildren<{ seed: string }>> = ({
  seed,
  children,
}) => {
  const camera = useThree(state => state.camera)
  const planet = useRef<HelloPlanet<any>>(null)
  const { geology, generated } = useGeology()
  const {
    lineWidth,
    contourWidth,
    contourAlpha,
    subgridAlpha,
    useShadows,
    showPlateBoundaries,
  } = useControls({
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
    showPlateBoundaries: false,
    useShadows: false,
  })

  const data = useMemo(() => {
    return {
      geology: geology.serialize(),
      seed,
      showPlateBoundaries,
    }
  }, [seed, geology.id, generated, showPlateBoundaries])

  console.log("world", geology.id, { generated, geology })

  // const edges = useMemo(() => {
  //   const value = Array.from(geology.plateBoundaries.values())[0]
  //   return Array.from(value.edges.values()).reduce(
  //     (memo, e) => [
  //       ...memo,
  //       e.cartA.x,
  //       e.cartA.y,
  //       e.cartA.z,
  //       e.cartB.x,
  //       e.cartB.y,
  //       e.cartB.z,
  //     ],
  //     [] as number[],
  //   )
  // }, [geology])

  return generated && geology.generated ? (
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
        <CustomShaderMaterial
          vertexColors
          uniforms={{
            uCameraPosition: { value: camera.position },
            uLineWidth: { value: lineWidth },
            uContourWidth: { value: contourWidth },
            uSubgridAlpha: { value: subgridAlpha },
            uContourAlpha: { value: contourAlpha },
            uRadius: { value: EARTH_RADIUS },
            // uWhatever: {
            //   value: edges,
            // },
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
            uniform float uRadius;

            varying vec2 vUv;

            float haversineDistance(vec3 point1, vec3 point2) {
                vec3 d = point2 - point1;
                float a = dot(d, d);
                float b = 2.0 * uRadius * sqrt(a - dot(d, normalize(point1)) * dot(d, normalize(point2)));
                return b;
            }

            float calculateClosestDistanceToLine(vec3 point, vec3 vertex1, vec3 vertex2) {
                float minDistance = 1000000.0; // A large initial value

                // Calculate distance to the line segment formed by vertex1 and vertex2
                float edgeDistance = haversineDistance(point, vertex1) + haversineDistance(point, vertex2);

                // Keep track of the minimum distance
                return min(minDistance, edgeDistance);
            }

            // float calculateClosestDistanceToEdges(vec3 point) {
            //     float minDistance = 1000000.0; // A large initial value
            //     for (int i = 0; i < edgeSize; i++) {
            //         vec3 vertex1 = uWhatever[i * 2];
            //         vec3 vertex2 = uWhatever[i * 2 + 1];
            //         float edgeDistance = calculateClosestDistanceToLine(point, vertex1, vertex2);
            //         minDistance = min(minDistance, edgeDistance);
            //     }
            //     return minDistance;
            // }


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
        {children}
      </Planet>
    </group>
  ) : null
}

export default World
