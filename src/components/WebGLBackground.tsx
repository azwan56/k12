import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Grid } from '@react-three/drei';
import * as THREE from 'three';

// Represents an abstract building block in the campus
function Building({ position, scale, color }: { position: [number, number, number], scale: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Add a subtle floating animation to some buildings
  useFrame((state) => {
    if (meshRef.current && scale[1] > 2) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

// Generates the city/campus layout
function CampusLayout() {
  const buildings = useMemo(() => {
    const items = [];
    const gridSize = 10;
    const spacing = 3;
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#4f46e5', '#a855f7'];

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        // Skip center to leave an open "plaza"
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;

        // Randomly place buildings
        if (Math.random() > 0.6) {
          const height = Math.random() * 4 + 0.5;
          const isTall = Math.random() > 0.8;
          const finalHeight = isTall ? height * 2 : height;
          const color = colors[Math.floor(Math.random() * colors.length)];

          items.push(
            <Building
              key={`${x}-${z}`}
              position={[x * spacing + (Math.random() - 0.5), finalHeight / 2, z * spacing + (Math.random() - 0.5)]}
              scale={[1.5 + Math.random(), finalHeight, 1.5 + Math.random()]}
              color={color}
            />
          );
        }
      }
    }
    return items;
  }, []);

  return <group>{buildings}</group>;
}

function FloatingNodes() {
  const groupRef = useRef<THREE.Group>(null!);

  const nodes = useMemo(() => {
    const items = [];
    for (let i = 0; i < 40; i++) {
      items.push({
        pos: [
          (Math.random() - 0.5) * 30,
          Math.random() * 10 + 2,
          (Math.random() - 0.5) * 30
        ] as [number, number, number],
        speed: Math.random() * 0.02 + 0.01
      });
    }
    return items;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <Float key={i} speed={node.speed * 100} rotationIntensity={2} floatIntensity={10}>
          <mesh position={node.pos}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

// Handles mouse interactivity and camera movement
function CameraRig() {
  const { camera, pointer } = useThree();
  const target = new THREE.Vector3(0, 5, 0);

  useFrame(() => {
    // Calculate target position based on mouse pointer
    // pointer.x and pointer.y are normalized between -1 and 1
    const targetX = pointer.x * 5;
    const targetY = pointer.y * 2 + 15; // Keep camera elevated

    // Smoothly interpolate camera position
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z = 25; // Fixed distance

    // Smoothly look at the center plaza
    camera.lookAt(target);
  });

  return null;
}

export default function WebGLBackground({ isDarkMode = true }: { isDarkMode?: boolean }) {
  const bgColor = isDarkMode ? '#09090b' : '#f4f4f5';

  return (
    <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-80'}`}>
      <Canvas
        shadows
        camera={{ position: [0, 15, 25], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 15, 45]} />

        <ambientLight intensity={isDarkMode ? 0.5 : 0.8} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={isDarkMode ? 1.5 : 1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, 10, -10]} intensity={isDarkMode ? 2 : 1} color="#4f46e5" />
        <pointLight position={[0, 5, 0]} intensity={isDarkMode ? 3 : 1.5} color="#8b5cf6" distance={20} />

        <CampusLayout />
        <FloatingNodes />
        <Grid
          renderOrder={-1}
          position={[0, 0, 0]}
          infiniteGrid
          cellSize={1}
          cellThickness={0.5}
          sectionSize={3}
          sectionThickness={1}
          cellColor={isDarkMode ? "#1e1e24" : "#e4e4e7"}
          sectionColor={isDarkMode ? "#27272a" : "#d4d4d8"}
          fadeDistance={30}
        />

        <CameraRig />
        <Environment preset={isDarkMode ? "city" : "dawn"} />
      </Canvas>
    </div>
  );
}
