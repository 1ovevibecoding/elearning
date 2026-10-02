"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function OrbMesh({ speed = 1, color = "#DA7756" }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    meshRef.current.rotation.x = t * 0.5;
    meshRef.current.rotation.y = t * 0.8;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 2]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
}

export default function LevelOrb({ speed = 1, color = "#DA7756", size = 120 }) {
  return (
    <div style={{ width: size, height: size, position: "relative", pointerEvents: "none" }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4] }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "low-power", antialias: false }}
        frameloop="demand"
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <OrbMesh speed={speed} color={color} />
      </Canvas>
    </div>
  );
}
