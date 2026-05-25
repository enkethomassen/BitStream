'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

// ─── Mouse Parallax ────────────────────────────────────────────────────────
function useMouseParallax() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return mouse;
}

// ─── BTC Crystal Vault ─────────────────────────────────────────────────────
function CrystalVault({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!meshRef.current || !glowRef.current || !ringRef.current || !ring2Ref.current) return;

    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;

    // Slow main rotation
    meshRef.current.rotation.y = t * 0.18 + mx * 0.15;
    meshRef.current.rotation.x = Math.sin(t * 0.12) * 0.15 + my * 0.1;
    meshRef.current.position.y = Math.sin(t * 0.4) * 0.08;

    // Glow pulsing
    const pulse = 1 + Math.sin(t * 1.2) * 0.06;
    glowRef.current.scale.setScalar(pulse * 1.18);
    glowRef.current.rotation.y = -t * 0.1;

    // Orbital rings
    ringRef.current.rotation.z = t * 0.25;
    ringRef.current.rotation.x = Math.PI / 2.6 + Math.sin(t * 0.2) * 0.05;
    ring2Ref.current.rotation.z = -t * 0.18;
    ring2Ref.current.rotation.y = t * 0.1;
  });

  return (
    <group>
      {/* Core icosahedron — the "vault" */}
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[1.1, 1]} />
        <MeshDistortMaterial
          color="#F7931A"
          emissive="#F7931A"
          emissiveIntensity={0.45}
          metalness={0.9}
          roughness={0.08}
          distort={0.18}
          speed={1.8}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshBasicMaterial color="#F7931A" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Orbital ring 1 */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.9, 0.015, 16, 120]} />
        <meshBasicMaterial color="#F7931A" transparent opacity={0.55} />
      </mesh>

      {/* Orbital ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.4, 0.009, 16, 120]} />
        <meshBasicMaterial color="#ffaa3c" transparent opacity={0.30} />
      </mesh>
    </group>
  );
}

// ─── Particle Field ─────────────────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = 600;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = clock.getElapsedTime() * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#F7931A"
        size={0.028}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Grid Lines ─────────────────────────────────────────────────────────────
function GridLines() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.z = ((clock.getElapsedTime() * 0.3) % 1.5) - 12;
  });

  const lines = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const step = 1.5;
    const w = 24, d = 24;

    for (let x = -w / 2; x <= w / 2; x += step) {
      verts.push(x, -4, -d / 2, x, -4, d / 2);
    }
    for (let z = -d / 2; z <= d / 2; z += step) {
      verts.push(-w / 2, -4, z, w / 2, -4, z);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, []);

  return (
    <group ref={ref}>
      <lineSegments>
        <primitive object={lines} attach="geometry" />
        <lineBasicMaterial color="#F7931A" transparent opacity={0.07} />
      </lineSegments>
    </group>
  );
}

// ─── Scene Camera Parallax ──────────────────────────────────────────────────
function CameraRig({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  useFrame(() => {
    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;
    camera.position.x += (mx * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (-my * 0.3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Main Scene Export ──────────────────────────────────────────────────────
export default function BitcoinHero3D() {
  const mouse = useMouseParallax();

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 52 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#F7931A" />
        <pointLight position={[-4, -2, 2]} intensity={0.8} color="#ffaa3c" />
        <pointLight position={[0, 0, 4]} intensity={0.4} color="#fff" />

        <CameraRig mouse={mouse} />
        <ParticleField />
        <GridLines />
        <CrystalVault mouse={mouse} />
        <Stars radius={80} depth={50} count={800} factor={3} saturation={0} fade speed={0.4} />

        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
