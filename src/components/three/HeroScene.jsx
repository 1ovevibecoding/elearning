"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField() {
  const pointsRef = useRef();

  // Generate particle positions
  const [positions, colors] = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const terracotta = new THREE.Color("#DA7756");
    const amber = new THREE.Color("#C9A35A");

    for (let i = 0; i < count; i++) {
      // Sphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 3 + Math.random() * 2;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const mixedColor = terracotta.clone().lerp(amber, Math.random());
      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime() * 0.15;
    pointsRef.current.rotation.y = time * 0.5;
    pointsRef.current.rotation.x = Math.sin(time * 0.3) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export default function HeroScene() {
  return (
    <div style={{ width: "100%", height: "400px", position: "relative", pointerEvents: "none" }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "low-power", antialias: false }}
        frameloop="demand"
      >
        <ParticleField />
      </Canvas>
    </div>
  );
}
