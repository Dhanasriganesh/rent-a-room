import * as THREE from "three";

/** One-shot canvas texture of the mediation admin panel for the tablet screen. */
export function createAdminScreenTexture() {
  const w = 1024;
  const h = 680;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Shell
  ctx.fillStyle = "#f3ebe3";
  ctx.fillRect(0, 0, w, h);

  // Sidebar
  ctx.fillStyle = "#2c1810";
  ctx.fillRect(0, 0, 210, h);

  ctx.fillStyle = "#ff8c00";
  roundRect(ctx, 28, 36, 36, 36, 10);
  ctx.fill();

  ctx.fillStyle = "#f3ebe3";
  ctx.font = "600 22px Outfit, Segoe UI, sans-serif";
  ctx.fillText("HomeRental", 74, 60);

  const nav = ["Overview", "Owners", "Properties", "Inventory", "Applicants", "Contracts", "Rent"];
  nav.forEach((label, i) => {
    const y = 120 + i * 52;
    if (i === 0) {
      ctx.fillStyle = "rgba(255,140,0,0.22)";
      roundRect(ctx, 16, y - 22, 178, 40, 12);
      ctx.fill();
    }
    ctx.fillStyle = i === 0 ? "#ff8c00" : "rgba(243,235,227,0.7)";
    ctx.font = "500 18px Outfit, Segoe UI, sans-serif";
    ctx.fillText(label, 36, y);
  });

  // Top bar
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(210, 0, w - 210, 72);
  ctx.fillStyle = "#2c1810";
  ctx.font = "600 26px Fraunces, Georgia, serif";
  ctx.fillText("Desk overview", 244, 46);
  ctx.fillStyle = "rgba(44,24,16,0.45)";
  ctx.font = "500 16px Outfit, Segoe UI, sans-serif";
  ctx.fillText("Live mediation workspace", 244, 66);

  // Stat cards
  const stats = [
    { label: "Active owners", value: "48", tone: "#2c1810" },
    { label: "Open beds", value: "126", tone: "#ff8c00" },
    { label: "In review", value: "19", tone: "#2c1810" },
    { label: "Contracts", value: "7", tone: "#2c1810" },
  ];
  stats.forEach((s, i) => {
    const x = 244 + i * 185;
    const y = 100;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, x, y, 170, 100, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(44,24,16,0.45)";
    ctx.font = "500 14px Outfit, Segoe UI, sans-serif";
    ctx.fillText(s.label, x + 18, y + 32);
    ctx.fillStyle = s.tone;
    ctx.font = "600 36px Fraunces, Georgia, serif";
    ctx.fillText(s.value, x + 18, y + 76);
  });

  // Table panel
  roundRect(ctx, 244, 230, 740, 400, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "#2c1810";
  ctx.font = "600 20px Outfit, Segoe UI, sans-serif";
  ctx.fillText("Applicant queue", 268, 268);

  const rows = [
    ["Maya K.", "Berlin · Room 2B", "Viewing", "#ff8c00"],
    ["Jonas R.", "Munich · Studio", "Allocated", "#2c1810"],
    ["Aisha M.", "Hamburg · Loft", "In review", "#c9a227"],
    ["Leon S.", "Cologne · Room 1A", "Contract", "#2c1810"],
    ["Priya N.", "Frankfurt · Bed 3", "New", "#ff8c00"],
  ];

  ctx.fillStyle = "rgba(44,24,16,0.08)";
  ctx.fillRect(268, 290, 692, 1);

  rows.forEach((row, i) => {
    const y = 330 + i * 54;
    ctx.fillStyle = i % 2 === 0 ? "rgba(44,24,16,0.03)" : "transparent";
    ctx.fillRect(268, y - 28, 692, 50);
    ctx.fillStyle = "#2c1810";
    ctx.font = "600 17px Outfit, Segoe UI, sans-serif";
    ctx.fillText(row[0], 284, y);
    ctx.fillStyle = "rgba(44,24,16,0.5)";
    ctx.font = "500 15px Outfit, Segoe UI, sans-serif";
    ctx.fillText(row[1], 430, y);
    // pill
    ctx.fillStyle = row[3];
    roundRect(ctx, 780, y - 16, 150, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 13px Outfit, Segoe UI, sans-serif";
    ctx.fillText(row[2], 800, y + 3);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
