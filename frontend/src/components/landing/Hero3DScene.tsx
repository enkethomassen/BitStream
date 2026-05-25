'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// ─── Mouse parallax hook ────────────────────────────────────────────────────

function useMouseParallax(strength = 0.08) {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return { mouse, strength };
}

// ─── Central BTC Vault Orb ──────────────────────────────────────────────────

function VaultOrb({ mouse, strength }: { mouse: React.MutableRefObject<{x:number;y:number}>; strength: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.18;
      meshRef.current.rotation.x = Math.sin(t * 0.09) * 0.15;
      meshRef.current.position.x = THREE.MathUtils.lerp(
        meshRef.current.position.x, mouse.current.x * strength * 1.2, 0.05
      );
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y, mouse.current.y * strength * 1.2, 0.05
      );
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = -t * 0.12;
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.04);
    }
  });

  return (
    <group>
      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={2.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#F7931A"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner glow ring */}
      <mesh scale={1.9}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#F7931A"
          transparent
          opacity={0.055}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Core vault orb */}
      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh ref={meshRef} castShadow>
          <icosahedronGeometry args={[1.35, 3]} />
          <MeshDistortMaterial
            color="#1a1206"
            emissive="#F7931A"
            emissiveIntensity={0.22}
            metalness={0.92}
            roughness={0.12}
            distort={0.18}
            speed={1.2}
            envMapIntensity={0.8}
          />
        </mesh>
      </Float>
    </group>
  );
}

// ─── Orbital Ring System ────────────────────────────────────────────────────

function OrbitalRing({
  radius,
  tilt,
  speed,
  color,
  opacity = 0.55,
  dashes = 60,
}: {
  radius: number;
  tilt: number;
  speed: number;
  color: string;
  opacity?: number;
  dashes?: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * speed;
    }
  });

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= dashes * 4; i++) {
      const a = (i / (dashes * 4)) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return pts;
  }, [radius, dashes]);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group ref={groupRef} rotation={[tilt, 0, 0]}>
      <primitive object={(() => { const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })); return l; })()} />
      {/* Orbital dot */}
      <mesh position={[radius, 0, 0]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Floating Particle Field ────────────────────────────────────────────────

function ParticleField() {
  const count = 280;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.022;
      ref.current.rotation.x = state.clock.elapsedTime * 0.010;
    }
  });

  return (
    <points ref={ref}>
      <primitive object={geo} attach="geometry" />
      <pointsMaterial
        color="#F7931A"
        size={0.032}
        transparent
        opacity={0.45}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Grid Floor ─────────────────────────────────────────────────────────────

function GridPlane() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(state.clock.elapsedTime * 0.5) * 0.03;
    }
  });

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(24, 24, 28, 28);
    return g;
  }, []);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
      <primitive object={geo} attach="geometry" />
      <meshBasicMaterial color="#F7931A" wireframe transparent opacity={0.12} />
    </mesh>
  );
}

// ─── Floating Data Nodes ─────────────────────────────────────────────────────

function DataNode({ position, color, delay }: { position: [number, number, number]; color: string; delay: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime + delay;
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.18;
      ref.current.rotation.y = t * 0.5;
      ref.current.rotation.z = t * 0.3;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.8}
        roughness={0.15}
      />
    </mesh>
  );
}

// ─── Scene camera parallax ──────────────────────────────────────────────────

function CameraRig({ mouse, strength }: { mouse: React.MutableRefObject<{x:number;y:number}>; strength: number }) {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mouse.current.x * strength * 0.5, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, mouse.current.y * strength * 0.5, 0.04);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Full Scene ──────────────────────────────────────────────────────────────

function Scene() {
  const { mouse, strength } = useMouseParallax(0.6);

  const dataNodes: Array<{ position: [number, number, number]; color: string; delay: number }> = [
    { position: [ 2.8,  1.2,  0.5], color: '#F7931A', delay: 0    },
    { position: [-2.6,  0.8, -0.3], color: '#ffaa3c', delay: 1.1  },
    { position: [ 1.5, -1.8,  0.8], color: '#00c9a7', delay: 2.3  },
    { position: [-1.8,  2.0, -0.6], color: '#F7931A', delay: 0.7  },
    { position: [ 3.2, -0.5,  0.2], color: '#ffaa3c', delay: 1.9  },
    { position: [-3.0, -1.2,  0.4], color: '#F7931A', delay: 3.1  },
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 4, 4]} intensity={1.8} color="#F7931A" />
      <pointLight position={[-4, -2, 2]} intensity={0.8} color="#ffaa3c" />
      <pointLight position={[0, 6, -3]} intensity={0.6} color="#ffffff" />

      {/* Camera parallax */}
      <CameraRig mouse={mouse} strength={strength} />

      {/* Central vault orb */}
      <VaultOrb mouse={mouse} strength={strength} />

      {/* Orbital rings */}
      <OrbitalRing radius={2.4} tilt={0.4}  speed={0.28}  color="#F7931A" opacity={0.50} />
      <OrbitalRing radius={3.2} tilt={1.1}  speed={-0.18} color="#ffaa3c" opacity={0.32} dashes={80} />
      <OrbitalRing radius={4.0} tilt={0.7}  speed={0.12}  color="#F7931A" opacity={0.20} dashes={100} />

      {/* Particle field */}
      <ParticleField />

      {/* Grid floor */}
      <GridPlane />

      {/* Floating data nodes */}
      {dataNodes.map((n, i) => <DataNode key={i} {...n} />)}

      {/* Sparkles */}
      <Sparkles
        count={60}
        scale={9}
        size={0.6}
        speed={0.25}
        opacity={0.55}
        color="#F7931A"
      />
    </>
  );
}

// ─── Public Component ────────────────────────────────────────────────────────

export function Hero3DScene({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // slight delay so Next.js hydration completes first
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div className={className} style={{ background: 'transparent', ...style }} />
    );
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 52 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
