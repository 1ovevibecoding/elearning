"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const count = 1000;
const [staticPositions, staticColors] = (() => {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  const terracotta = new THREE.Color("#DA7756");
  const amber = new THREE.Color("#C9A35A");

  for (let i = 0; i < count; i++) {
    const u = ((Math.sin(i * 12.9898 + 1.23) * 43758.5453) % 1 + 1) % 1;
    const v = ((Math.sin(i * 78.233 + 4.56) * 43758.5453) % 1 + 1) % 1;
    const rSeed = ((Math.sin(i * 37.719 + 7.89) * 43758.5453) % 1 + 1) % 1;
    const cSeed = ((Math.sin(i * 91.341 + 2.34) * 43758.5453) % 1 + 1) % 1;

    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 2.5 + rSeed * 1.5;

    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);

    const mixedColor = terracotta.clone().lerp(amber, cSeed);
    col[i * 3] = mixedColor.r;
    col[i * 3 + 1] = mixedColor.g;
    col[i * 3 + 2] = mixedColor.b;
  }
  return [pos, col];
})();

function ParticleField() {
  const pointsRef = useRef();

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime() * 0.1;
    pointsRef.current.rotation.y = time;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[staticPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[staticColors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

export default function HeroScene() {
  return (
    <div style={{ width: "100%", height: "300px", position: "relative" }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "low-power", antialias: false }}
        frameloop="always"
      >
        <ParticleField />
      </Canvas>
    </div>
  );
}
