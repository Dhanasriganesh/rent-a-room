/**
 * Shared motion bus between the HTML tablet and the WebGL house.
 * tabletProgress: 0 = closed/off-screen, 1 = fully open in the desk section.
 */
export const landingMotion = {
  tabletProgress: 0,
};

/** Parked clear of the tablet while the tab is open */
export const HOUSE_LEFT_DOCK = {
  pos: [-2.15, -0.35, -0.25],
  rot: [0.06, 0.95, 0.02],
  scale: 0.72,
};

/** Fills the tablet’s right-side slot only after the tab has closed */
export const HOUSE_RIGHT_DOCK = {
  pos: [1.4, -0.18, 0.08],
  rot: [0.1, -0.52, 0],
  scale: 1.1,
};

export function lerpHouse(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return {
    pos: [
      a.pos[0] + (b.pos[0] - a.pos[0]) * u,
      a.pos[1] + (b.pos[1] - a.pos[1]) * u,
      a.pos[2] + (b.pos[2] - a.pos[2]) * u,
    ],
    rot: [
      a.rot[0] + (b.rot[0] - a.rot[0]) * u,
      a.rot[1] + (b.rot[1] - a.rot[1]) * u,
      a.rot[2] + (b.rot[2] - a.rot[2]) * u,
    ],
    scale: a.scale + (b.scale - a.scale) * u,
  };
}
