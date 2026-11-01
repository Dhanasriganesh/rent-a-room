import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Higher-fidelity modern villa — still GPU-light (instanced-friendly primitives).
 */
export default function HouseModel({ progressRef }) {
  const group = useRef();

  const mats = useMemo(() => {
    const white = new THREE.MeshStandardMaterial({
      color: "#f7f3ee",
      roughness: 0.55,
      metalness: 0.08,
    });
    const clay = new THREE.MeshStandardMaterial({
      color: "#e8d8c8",
      roughness: 0.62,
      metalness: 0.05,
    });
    const charcoal = new THREE.MeshStandardMaterial({
      color: "#2a211c",
      roughness: 0.42,
      metalness: 0.22,
    });
    const wood = new THREE.MeshStandardMaterial({
      color: "#8b5a3c",
      roughness: 0.7,
      metalness: 0.05,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#d7eaf7",
      roughness: 0.05,
      metalness: 0.15,
      transmission: 0.55,
      thickness: 0.4,
      transparent: true,
      opacity: 0.85,
      emissive: "#ffcf8a",
      emissiveIntensity: 0.08,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: "#1A9B72",
      roughness: 0.35,
      metalness: 0.3,
      emissive: "#1A9B72",
      emissiveIntensity: 0.12,
    });
    const teal = new THREE.MeshStandardMaterial({
      color: "#1B4332",
      roughness: 0.55,
      metalness: 0.1,
    });
    const grass = new THREE.MeshStandardMaterial({
      color: "#52B788",
      roughness: 0.95,
      metalness: 0,
    });
    const stone = new THREE.MeshStandardMaterial({
      color: "#c5c0b6",
      roughness: 0.88,
      metalness: 0.02,
    });
    return { white, clay, charcoal, wood, glass, accent, teal, grass, stone };
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !progressRef?.current) return;
    const { house } = progressRef.current;
    const g = group.current;
    const k = 1 - Math.exp(-8.5 * delta);
    g.position.x = THREE.MathUtils.lerp(g.position.x, house.pos[0], k);
    g.position.y = THREE.MathUtils.lerp(g.position.y, house.pos[1], k);
    g.position.z = THREE.MathUtils.lerp(g.position.z, house.pos[2], k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, house.rot[0], k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, house.rot[1], k);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, house.rot[2], k);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, house.scale, k));
    g.rotation.y += Math.sin(performance.now() * 0.00035) * 0.00012;
  });

  return (
    <group ref={group} position={[0.9, -0.2, 0]} rotation={[0.1, -0.55, 0]}>
      {/* Ground pad */}
      <mesh position={[0, -0.92, 0.1]} receiveShadow material={mats.stone}>
        <cylinderGeometry args={[1.85, 1.95, 0.08, 48]} />
      </mesh>
      <mesh position={[0.15, -0.86, 0.55]} receiveShadow material={mats.stone}>
        <boxGeometry args={[1.1, 0.06, 0.55]} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow material={mats.white}>
        <boxGeometry args={[2.05, 1.35, 1.5]} />
      </mesh>

      {/* Side wing — teal accent volume */}
      <mesh position={[-0.95, -0.28, 0.15]} castShadow receiveShadow material={mats.teal}>
        <boxGeometry args={[0.55, 1.05, 1.15]} />
      </mesh>

      {/* Upper floor / cantilever */}
      <mesh position={[0.4, 0.95, -0.08]} castShadow receiveShadow material={mats.clay}>
        <boxGeometry args={[1.35, 0.85, 1.2]} />
      </mesh>

      {/* Flat roof plates */}
      <mesh position={[0.4, 1.42, -0.08]} castShadow material={mats.charcoal}>
        <boxGeometry args={[1.48, 0.07, 1.32]} />
      </mesh>
      <mesh position={[-0.35, 0.58, 0]} castShadow material={mats.charcoal}>
        <boxGeometry args={[1.45, 0.07, 1.62]} />
      </mesh>
      <mesh position={[-0.95, 0.3, 0.15]} castShadow material={mats.charcoal}>
        <boxGeometry args={[0.62, 0.06, 1.22]} />
      </mesh>

      {/* Chimney */}
      <mesh position={[-0.7, 1.05, -0.45]} castShadow material={mats.charcoal}>
        <boxGeometry args={[0.22, 0.7, 0.22]} />
      </mesh>
      <mesh position={[-0.7, 1.42, -0.45]} material={mats.accent}>
        <boxGeometry args={[0.26, 0.05, 0.26]} />
      </mesh>

      {/* Entrance niche + door */}
      <mesh position={[0.25, -0.35, 0.78]} castShadow material={mats.clay}>
        <boxGeometry args={[0.7, 0.95, 0.12]} />
      </mesh>
      <mesh position={[0.25, -0.38, 0.86]} castShadow material={mats.wood}>
        <boxGeometry args={[0.42, 0.82, 0.05]} />
      </mesh>
      <mesh position={[0.4, -0.35, 0.9]} material={mats.accent}>
        <sphereGeometry args={[0.035, 16, 16]} />
      </mesh>

      {/* Window glass ribbons */}
      <mesh position={[-0.45, 0.1, 0.76]} material={mats.glass}>
        <boxGeometry args={[0.62, 0.55, 0.04]} />
      </mesh>
      <mesh position={[0.78, 0.12, 0.76]} material={mats.glass}>
        <boxGeometry args={[0.45, 0.6, 0.04]} />
      </mesh>
      <mesh position={[0.4, 1.0, 0.54]} material={mats.glass}>
        <boxGeometry args={[1.05, 0.48, 0.04]} />
      </mesh>
      <mesh position={[-1.23, -0.15, 0.15]} rotation={[0, Math.PI / 2, 0]} material={mats.glass}>
        <boxGeometry args={[0.7, 0.55, 0.04]} />
      </mesh>
      <mesh position={[0.4, 1.0, -0.7]} material={mats.glass}>
        <boxGeometry args={[0.85, 0.4, 0.04]} />
      </mesh>

      {/* Mullions */}
      <mesh position={[-0.45, 0.1, 0.79]} material={mats.charcoal}>
        <boxGeometry args={[0.025, 0.55, 0.02]} />
      </mesh>
      <mesh position={[-0.45, 0.1, 0.79]} material={mats.charcoal}>
        <boxGeometry args={[0.62, 0.025, 0.02]} />
      </mesh>
      <mesh position={[0.4, 1.0, 0.57]} material={mats.charcoal}>
        <boxGeometry args={[0.025, 0.48, 0.02]} />
      </mesh>

      {/* Orange fascia band */}
      <mesh position={[0.05, 0.55, 0.77]} material={mats.accent}>
        <boxGeometry args={[2.08, 0.05, 0.04]} />
      </mesh>

      {/* Balcony rail suggestion */}
      <mesh position={[0.4, 0.58, 0.55]} material={mats.charcoal}>
        <boxGeometry args={[1.1, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0.4, 0.45, 0.55]} material={mats.charcoal}>
        <boxGeometry args={[1.1, 0.02, 0.02]} />
      </mesh>

      {/* Planters */}
      <mesh position={[-1.2, -0.7, 0.75]} castShadow material={mats.charcoal}>
        <cylinderGeometry args={[0.18, 0.2, 0.28, 16]} />
      </mesh>
      <mesh position={[-1.2, -0.48, 0.75]} castShadow material={mats.grass}>
        <sphereGeometry args={[0.2, 16, 12]} />
      </mesh>
      <mesh position={[1.15, -0.72, 0.7]} castShadow material={mats.charcoal}>
        <cylinderGeometry args={[0.16, 0.18, 0.24, 16]} />
      </mesh>
      <mesh position={[1.15, -0.52, 0.7]} castShadow material={mats.grass}>
        <sphereGeometry args={[0.18, 16, 12]} />
      </mesh>
    </group>
  );
}
