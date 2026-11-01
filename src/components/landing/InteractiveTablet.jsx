import { useEffect, useRef } from "react";
import DeskConsole from "./DeskConsole";
import { landingMotion } from "./landingMotion";

/**
 * Tablet appears only while "The admin panel that runs the whole desk" is in view.
 * Slides in from off-screen right and exits the same way — lerped for butter motion.
 * Writes tabletProgress so the 3D house can take the right-side slot when it leaves.
 */
export default function InteractiveTablet() {
  const shellRef = useRef(null);
  const progressRef = useRef(0);
  const lastTsRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let alive = true;

    const sectionProgress = () => {
      const section = document.getElementById("desk-panel-section");
      if (!section) return 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // How much of the section overlaps the viewport
      const overlap = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      const overlapRatio = Math.max(0, overlap) / Math.min(rect.height, vh);

      // Peak when section center is near viewport center
      const sectionCenter = rect.top + rect.height / 2;
      const viewCenter = vh / 2;
      const centerScore = 1 - Math.min(1, Math.abs(sectionCenter - viewCenter) / (vh * 0.72));

      // Only fully on during this section — zero once you've scrolled past/into others
      const raw = Math.max(0, centerScore) * Math.min(1, overlapRatio * 1.35);
      // Soft threshold so tiny overlaps don't flicker
      if (raw < 0.08) return 0;
      return Math.min(1, (raw - 0.08) / 0.92);
    };

    const tick = (ts) => {
      if (!alive || !shellRef.current) return;
      const dt = lastTsRef.current ? Math.min(0.05, (ts - lastTsRef.current) / 1000) : 0.016;
      lastTsRef.current = ts;

      const target = sectionProgress();
      // Critically damped ease — smooth arrive & leave
      const k = 1 - Math.exp(-7.5 * dt);
      progressRef.current += (target - progressRef.current) * k;
      const p = progressRef.current;
      landingMotion.tabletProgress = p;

      const shell = shellRef.current;
      const mobile = window.matchMedia("(max-width: 900px)").matches;
      const travel = mobile
        ? Math.min(window.innerWidth * 0.95, shell.offsetWidth + 48)
        : Math.min(window.innerWidth * 0.55, shell.offsetWidth + 120);

      // Off-screen right → docked placement
      const x = (1 - p) * travel;
      const opacity = Math.min(1, p * 1.15);

      if (mobile) {
        shell.style.left = "50%";
        shell.style.right = "auto";
        shell.style.top = "auto";
        shell.style.bottom = "0.75rem";
        shell.style.transform = `translate3d(calc(-50% + ${x * 0.35}px), ${(1 - p) * 28}px, 0)`;
      } else {
        shell.style.left = "auto";
        shell.style.right = "";
        shell.style.top = "50%";
        shell.style.bottom = "auto";
        shell.style.transform = `translate3d(${x}px, -50%, 0)`;
      }

      shell.style.opacity = String(opacity);
      shell.style.visibility = opacity < 0.02 ? "hidden" : "visible";
      shell.style.pointerEvents = opacity > 0.55 ? "auto" : "none";
      shell.setAttribute("aria-hidden", opacity > 0.55 ? "false" : "true");

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      landingMotion.tabletProgress = 0;
    };
  }, []);

  return (
    <div className="landing-tablet" ref={shellRef} aria-hidden="true">
      <div className="landing-tablet__stage">
        <div className="landing-tablet__device">
          <div className="landing-tablet__bezel">
            <div className="landing-tablet__camera" aria-hidden="true" />
            <div className="landing-tablet__screen">
              <DeskConsole />
            </div>
          </div>
        </div>
      </div>
      <p className="landing-tablet__caption">Live desk console — click any section</p>
    </div>
  );
}
