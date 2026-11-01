import { lazy, Suspense, useEffect, useRef } from "react";
import LandingNarrative from "../../components/landing/LandingNarrative";
import InteractiveTablet from "../../components/landing/InteractiveTablet";

const LandingCanvas = lazy(() => import("../../components/landing/LandingCanvas"));

/**
 * Product landing — scroll-driven house + interactive CSS-3D tablet (operable admin).
 */
export default function Home() {
  const scrollProgressRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const prevScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const update = () => {
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      scrollProgressRef.current = Math.min(1, Math.max(0, window.scrollY / max));
      rafRef.current = 0;
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      root.style.scrollBehavior = prevScrollBehavior;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="landing landing--product">
      <div className="landing-bg" aria-hidden="true" />
      <Suspense fallback={<div className="landing-canvas landing-canvas--placeholder" aria-hidden="true" />}>
        <LandingCanvas scrollProgressRef={scrollProgressRef} />
      </Suspense>
      <InteractiveTablet />
      <LandingNarrative />
    </div>
  );
}
