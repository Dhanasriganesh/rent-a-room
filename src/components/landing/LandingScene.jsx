import { Suspense, useRef } from "react";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import HouseModel from "./HouseModel";
import { sampleStory } from "./scrollStory";
import {
  HOUSE_LEFT_DOCK,
  HOUSE_RIGHT_DOCK,
  landingMotion,
  lerpHouse,
} from "./landingMotion";

/**
 * House stays LEFT while the tablet is open.
 * Only after the tablet has closed does the house take the right-side slot.
 */
export default function LandingScene({ scrollProgressRef, reducedMotion }) {
  const progressRef = useRef(sampleStory(0));

  useFrame(() => {
    const p = scrollProgressRef.current ?? 0;
    const story = sampleStory(reducedMotion ? 0.12 : p);
    const tabletP = landingMotion.tabletProgress;

    let house = story.house;

    if (tabletP > 0.04) {
      // Tab is on screen → house must leave the right stage entirely
      house = lerpHouse(story.house, HOUSE_LEFT_DOCK, Math.min(1, tabletP * 1.35));
    } else {
      // Tab fully closed — if we've scrolled past the desk section, fill that right slot
      const section =
        typeof document !== "undefined"
          ? document.getElementById("desk-panel-section")
          : null;
      if (section) {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const scrolledPast = rect.bottom < vh * 0.5;
        if (scrolledPast) {
          house = HOUSE_RIGHT_DOCK;
        }
      }
    }

    progressRef.current = {
      ...story,
      house,
      tablet: { ...story.tablet, opacity: tabletP },
    };
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.7} color="#fff7eb" groundColor="#9db0c9" />
      <directionalLight
        castShadow={!reducedMotion}
        position={[5, 8, 4]}
        intensity={1.55}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={24}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.55} color="#74C69D" />
      <directionalLight position={[2, 1, 5]} intensity={0.35} color="#7eb6ff" />

      <Environment resolution={256}>
        <Lightformer intensity={1.2} position={[0, 4, 0]} scale={[8, 1, 1]} color="#ffffff" />
        <Lightformer intensity={0.8} position={[4, 1, 2]} scale={[4, 3, 1]} color="#95D5B2" />
        <Lightformer intensity={0.6} position={[-4, 1, -2]} scale={[4, 3, 1]} color="#8ec5ff" />
      </Environment>

      <Suspense fallback={null}>
        <HouseModel progressRef={progressRef} />
      </Suspense>

      {!reducedMotion && (
        <ContactShadows
          position={[0, -1.45, 0]}
          opacity={0.45}
          scale={14}
          blur={2.8}
          far={6}
          resolution={512}
          color="#1a2744"
        />
      )}
    </>
  );
}
