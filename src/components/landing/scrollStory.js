/** Scroll keyframes — house clears the right side so the interactive tablet can dock there. */

const DESKTOP = [
  {
    id: "hero",
    from: 0,
    to: 0.18,
    house: { pos: [0.35, -0.15, 0.1], rot: [0.1, -0.5, 0], scale: 1.08 },
    tablet: { opacity: 0 },
  },
  {
    id: "owners",
    from: 0.18,
    to: 0.36,
    house: { pos: [-0.15, -0.2, 0.15], rot: [0.08, 0.55, 0], scale: 0.98 },
    tablet: { opacity: 0 },
  },
  {
    id: "workspace",
    from: 0.36,
    to: 0.58,
    house: { pos: [-2.15, -0.35, -0.25], rot: [0.06, 0.95, 0.02], scale: 0.72 },
    tablet: { opacity: 1 },
  },
  {
    id: "mediators",
    from: 0.58,
    to: 0.78,
    // Right stage — only after the tablet has left
    house: { pos: [1.4, -0.18, 0.08], rot: [0.1, -0.52, 0], scale: 1.1 },
    tablet: { opacity: 0 },
  },
  {
    id: "close",
    from: 0.78,
    to: 1,
    house: { pos: [1.15, -0.2, 0.05], rot: [0.1, -0.4, 0], scale: 1.02 },
    tablet: { opacity: 0 },
  },
];

const MOBILE = [
  {
    id: "hero",
    from: 0,
    to: 0.18,
    house: { pos: [0.05, 0.55, 0], rot: [0.12, -0.4, 0], scale: 0.78 },
    tablet: { opacity: 0 },
  },
  {
    id: "owners",
    from: 0.18,
    to: 0.36,
    house: { pos: [0, 0.6, 0], rot: [0.1, 0.5, 0], scale: 0.72 },
    tablet: { opacity: 0 },
  },
  {
    id: "workspace",
    from: 0.36,
    to: 0.58,
    house: { pos: [-0.35, 0.85, -0.2], rot: [0.08, 0.85, 0], scale: 0.45 },
    tablet: { opacity: 1 },
  },
  {
    id: "mediators",
    from: 0.58,
    to: 0.78,
    house: { pos: [0.55, 0.55, 0.1], rot: [0.1, -0.45, 0], scale: 0.72 },
    tablet: { opacity: 0 },
  },
  {
    id: "close",
    from: 0.78,
    to: 1,
    house: { pos: [0.35, 0.5, 0], rot: [0.1, -0.35, 0], scale: 0.7 },
    tablet: { opacity: 0 },
  },
];

export const STAGES = DESKTOP;

function getStages() {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) {
    return MOBILE;
  }
  return DESKTOP;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVec3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function sampleStory(progress) {
  const stages = getStages();
  const p = clamp01(progress);
  let i = 0;
  while (i < stages.length - 1 && p >= stages[i + 1].from) i += 1;

  const a = stages[i];
  const b = stages[Math.min(i + 1, stages.length - 1)];

  if (a === b) {
    return {
      stage: a.id,
      house: a.house,
      tablet: { pos: [0, 0, 0], rot: [0, 0, 0], scale: 1, opacity: a.tablet.opacity },
      blend: 0,
    };
  }

  const tb = smoothstep((p - a.from) / Math.max(0.0001, b.from - a.from));

  return {
    stage: tb < 0.5 ? a.id : b.id,
    house: {
      pos: lerpVec3(a.house.pos, b.house.pos, tb),
      rot: lerpVec3(a.house.rot, b.house.rot, tb),
      scale: lerp(a.house.scale, b.house.scale, tb),
    },
    tablet: {
      pos: [0, 0, 0],
      rot: [0, 0, 0],
      scale: 1,
      opacity: lerp(a.tablet.opacity, b.tablet.opacity, tb),
    },
    blend: tb,
  };
}
