import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { createAdminScreenTexture } from "./createAdminScreenTexture";

/**
 * Floating tablet with the mediation admin panel on-screen.
 */
export default function TabletModel({ progressRef }) {
  const group = useRef();
  const screenMat = useRef();

  const { frameMat, bezelMat, screenMap } = useMemo(() => {
    const frameMat = new THREE.MeshStandardMaterial({
      color: "#1a0e0a",
      roughness: 0.32,
      metalness: 0.6,
    });
    const bezelMat = new THREE.MeshStandardMaterial({
      color: "#2c1810",
      roughness: 0.42,
      metalness: 0.35,
    });
    const screenMap = createAdminScreenTexture();
    return { frameMat, bezelMat, screenMap };
  }, []);

  useFrame((_, delta) => {
    if (!group.current || !progressRef?.current) return;
    const { tablet } = progressRef.current;
    const g = group.current;
    const k = 1 - Math.exp(-9 * delta);

    g.position.x = THREE.MathUtils.lerp(g.position.x, tablet.pos[0], k);
    g.position.y = THREE.MathUtils.lerp(g.position.y, tablet.pos[1], k);
    g.position.z = THREE.MathUtils.lerp(g.position.z, tablet.pos[2], k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, tablet.rot[0], k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, tablet.rot[1], k);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, tablet.rot[2], k);
    const s = THREE.MathUtils.lerp(g.scale.x, tablet.scale, k);
    g.scale.setScalar(s);

    const targetOpacity = tablet.opacity;
    g.visible = targetOpacity > 0.02;
    if (screenMat.current) {
      screenMat.current.opacity = THREE.MathUtils.lerp(
        screenMat.current.opacity,
        Math.max(0.05, targetOpacity),
        k
      );
    }
    if (targetOpacity > 0.5) {
      g.position.y += Math.sin(performance.now() * 0.0012) * 0.00085;
    }
  });

  const W = 1.62;
  const H = 1.12;
  const D = 0.055;

  return (
    <group ref={group} position={[3.4, 0.2, -1]} visible={false}>
      <RoundedBox args={[W, H, D]} radius={0.06} smoothness={4} castShadow material={frameMat} />
      <RoundedBox
        args={[W * 0.94, H * 0.92, 0.012]}
        radius={0.045}
        smoothness={4}
        position={[0, 0, D * 0.55]}
        material={bezelMat}
      />
      <mesh position={[0, 0, D * 0.7]}>
        <planeGeometry args={[W * 0.88, H * 0.84]} />
        <meshBasicMaterial
          ref={screenMat}
          map={screenMap}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      <mesh position={[0, H * 0.435, D * 0.58]} material={bezelMat}>
        <circleGeometry args={[0.016, 16]} />
      </mesh>
    </group>
  );
}
