/**
 * Offline verification for Phase 9 (no emulator / no credentials).
 * node scripts/verify-phase9.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function pass(name) {
  results.push({ ok: true, name });
  console.log(`  PASS  ${name}`);
}
function fail(name, err) {
  results.push({ ok: false, name, err: String(err?.message || err) });
  console.error(`  FAIL  ${name}\n        ${err?.message || err}`);
}
function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}
function mustInclude(text, needles, label) {
  for (const n of needles) {
    if (!text.includes(n)) throw new Error(`${label} missing: ${n}`);
  }
}

console.log("\n=== Offline Phase 9 verification ===\n");

try {
  const files = [
    "src/lib/rateLimit.js",
    "src/components/ErrorBoundary.jsx",
    "src/pages/admin/Settings.jsx",
    "docs/PHASE9_HARDENING.md",
    "docs/SECURITY_REVIEW.md",
    "docs/BACKUPS_RESTORE.md",
    "docs/DEPLOY_ROLLBACK.md",
    "docs/STAFF_GUIDE.md",
  ];
  for (const f of files) {
    if (!existsSync(resolve(root, f))) throw new Error(`missing file ${f}`);
  }
  pass("Phase 9 files exist");
} catch (e) {
  fail("Phase 9 files exist", e);
}

try {
  const rl = read("src/lib/rateLimit.js");
  mustInclude(rl, ["assertClientRateLimit", "RATE_LIMITS", "website_chat"], "rateLimit");
  pass("rateLimit helper");
} catch (e) {
  fail("rateLimit helper", e);
}

try {
  const fs = read("src/lib/firestore.js");
  mustInclude(
    fs,
    [
      "getHardeningSettings",
      "updateHardeningSettings",
      "SECURITY_REVIEW_CHECKLIST",
      "PRODUCTION_READINESS_CHECKLIST",
      "participantIds",
      "maintenanceMode",
    ],
    "firestore"
  );
  pass("hardening helpers in firestore.js");
} catch (e) {
  fail("hardening helpers in firestore.js", e);
}

try {
  const rules = read("firestore.rules");
  mustInclude(rules, ["docId == 'hardening'", "move_events"], "rules");
  pass("firestore.rules hardening + move_events");
} catch (e) {
  fail("firestore.rules hardening + move_events", e);
}

try {
  mustInclude(read("src/components/applications/ApplyModal.jsx"), ["assertClientRateLimit"], "ApplyModal");
  mustInclude(read("src/components/messages/WebsiteMessenger.jsx"), ["assertClientRateLimit"], "WebsiteMessenger");
  mustInclude(read("src/pages/auth/Register.jsx"), ["assertClientRateLimit"], "Register");
  pass("rate limits wired on public surfaces");
} catch (e) {
  fail("rate limits wired on public surfaces", e);
}

try {
  mustInclude(read("src/main.jsx"), ["ErrorBoundary"], "main");
  mustInclude(read("src/pages/admin/Settings.jsx"), ["getHardeningSettings", "SECURITY_REVIEW_CHECKLIST"], "Settings");
  pass("ErrorBoundary + Settings UI");
} catch (e) {
  fail("ErrorBoundary + Settings UI", e);
}

try {
  const env = read(".env.example");
  if (env.includes("WHATSAPP_ACCESS_TOKEN=") && env.includes("VITE_WHATSAPP_ACCESS_TOKEN")) {
    throw new Error("WhatsApp token must not be VITE_ prefixed");
  }
  mustInclude(env, ["VITE_FIREBASE_API_KEY", "Phase 9"], ".env.example");
  pass(".env.example has no live WA token in Vite");
} catch (e) {
  fail(".env.example has no live WA token in Vite", e);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===\n`);
process.exit(failed.length ? 1 : 0);
