"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const count = 800;
const [staticPositions, staticColors] = (() => {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color("#DA7756");
  const c2 = new THREE.Color("#C9A35A");

  for (let i = 0; i < count; i++) {
    // Seeded pseudo-random formula
    const r1 = ((Math.sin(i * 12.9898 + 1.23) * 43758.5453) % 1 + 1) % 1;
    const r2 = ((Math.sin(i * 78.233 + 4.56) * 43758.5453) % 1 + 1) % 1;
    const r3 = ((Math.sin(i * 37.719 + 7.89) * 43758.5453) % 1 + 1) % 1;
    const r4 = ((Math.sin(i * 91.341 + 2.34) * 43758.5453) % 1 + 1) % 1;

    pos[i * 3] = (r1 - 0.5) * 20;
    pos[i * 3 + 1] = (r2 - 0.5) * 20;
    pos[i * 3 + 2] = (r3 - 0.5) * 5;

    const mixed = c1.clone().lerp(c2, r4);
    col[i * 3] = mixed.r;
    col[i * 3 + 1] = mixed.g;
    col[i * 3 + 2] = mixed.b;
  }
  return [pos, col];
})();

function AmbientWave() {
  const pointsRef = useRef();

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime() * 0.05;
    pointsRef.current.rotation.y = t * 0.2;
    pointsRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
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
        size={0.04}
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

export default function AmbientBackground() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.6,
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "low-power", antialias: false }}
        frameloop="demand"
      >
        <AmbientWave />
      </Canvas>
    </div>
  );
}
