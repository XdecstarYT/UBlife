import { useMemo } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
  float h = normalize(vWorldPosition).y;
  float t = pow(max(h, 0.0), exponent);
  gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
}
`;

interface SkyDomeProps {
  topColor?: string;
  horizonColor?: string;
  exponent?: number;
  radius?: number;
}

/**
 * A cheap gradient sky dome (one flat-shaded sphere, two-color lerp in the
 * fragment shader) instead of a full atmospheric-scattering sky — much
 * lighter on a phone GPU, and the colors are exact rather than tuned blind
 * through turbidity/rayleigh parameters.
 */
export function SkyDome({
  topColor = '#4a90d9',
  horizonColor = '#cfe8f5',
  exponent = 0.6,
  radius = 300,
}: SkyDomeProps) {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(topColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
      exponent: { value: exponent },
    }),
    [topColor, horizonColor, exponent]
  );

  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[radius, 16, 12]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
