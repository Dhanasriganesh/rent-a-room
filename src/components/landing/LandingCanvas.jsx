import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import LandingScene from "./LandingScene";

function preferReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

/**
 * Fixed WebGL layer — scroll progress drives the 3D story without React re-renders.
 */
export default function LandingCanvas({ scrollProgressRef }) {
  const [reducedMotion, setReducedMotion] = useState(preferReducedMotion);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapRef = useRef(null);

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return [1, 1.25];
    const mobile = isMobileViewport();
    const cap = mobile ? 1.15 : 1.5;
    return [1, Math.min(cap, window.devicePixelRatio || 1)];
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    // Defer WebGL one frame so first paint of HTML isn't blocked
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      mq.removeEventListener?.("change", onChange);
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!ready) {
    return <div className="landing-canvas landing-canvas--placeholder" aria-hidden="true" />;
  }

  return (
    <div ref={wrapRef} className="landing-canvas" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{
          antialias: !isMobileViewport(),
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          premultipliedAlpha: true,
        }}
        camera={{ position: [0, 0.55, 5.1], fov: 40, near: 0.1, far: 40 }}
        frameloop={visible && !reducedMotion ? "always" : "demand"}
        shadows={!reducedMotion && !isMobileViewport()}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.style.touchAction = "pan-y";
        }}
      >
        <LandingScene scrollProgressRef={scrollProgressRef} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
