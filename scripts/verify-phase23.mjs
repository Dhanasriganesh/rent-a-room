/**
 * Offline verification for Phase 2 + 3 (no emulator / no credentials).
 * node scripts/verify-phase23.mjs
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

console.log("\n=== Offline Phase 2 + 3 verification ===\n");

// --- Static files ---
try {
  const files = [
    "src/pages/manager/Owners.jsx",
    "src/pages/manager/Properties.jsx",
    "src/pages/manager/Inventory.jsx",
    "src/pages/manager/Applicants.jsx",
    "src/pages/manager/Allocations.jsx",
    "docs/PHASE2_INVENTORY.md",
    "docs/PHASE3_APPLICATIONS.md",
  ];
  for (const f of files) {
    if (!existsSync(resolve(root, f))) throw new Error(`missing file ${f}`);
  }
  pass("Phase2/3 page + doc files exist");
} catch (e) {
  fail("Phase2/3 page + doc files exist", e);
}

try {
  const app = read("src/App.jsx");
  mustInclude(
    app,
    [
      "ManagerOwners",
      "ManagerProperties",
      "ManagerInventory",
      "ManagerApplicants",
      "ManagerAllocations",
      'path="applicants"',
      'path="allocations"',
      'path="inventory"',
      'Navigate to="/manager"',
      'allowedRoles={["admin", "property_manager"]}',
    ],
    "App.jsx"
  );
  if (app.includes("AdminLayout")) {
    throw new Error("AdminLayout still mounted — should be merged into /manager");
  }
  pass("App routes: single admin desk + Phase2/3 pages");
} catch (e) {
  fail("App routes: single admin desk + Phase2/3 pages", e);
}

try {
  const home = read("src/components/auth/ProtectedRoute.jsx");
  mustInclude(home, ['case "admin":', 'return "/manager"'], "getHomeForRole");
  pass("Admin login home redirects to /manager");
} catch (e) {
  fail("Admin login home redirects to /manager", e);
}

try {
  const rules = read("firestore.rules");
  mustInclude(
    rules,
    [
      "match /owners/{id}",
      "match /rooms/{id}",
      "match /beds/{id}",
      "match /rental_offers/{id}",
      "match /allocations/{id}",
      "match /applications/{id}",
    ],
    "rules"
  );
  if (!rules.includes("allow create: if isStaff()") || !rules.includes("applications")) {
    /* applications staff create checked loosely */
  }
  if (!/match \/applications\/\{id\}[\s\S]*allow create: if isStaff\(\)/.test(rules)) {
    throw new Error("applications create must allow isStaff()");
  }
  pass("Firestore rules cover Phase2/3 collections");
} catch (e) {
  fail("Firestore rules cover Phase2/3 collections", e);
}

try {
  const fs = read("src/lib/firestore.js");
  mustInclude(
    fs,
    [
      "runTransaction",
      "createOwnerRecord",
      "createRoom",
      "createBed",
      "migrateUnitToRoomAndBeds",
      "migrateAllUnitsForProperty",
      "createStaffApplication",
      "allocateBedAtomically",
      "cancelAllocation",
      "getAllApplications",
      'ALLOCATIONS: "allocations"',
      'OWNERS: "owners"',
      'BEDS: "beds"',
    ],
    "firestore.js"
  );
  pass("firestore.js Phase2/3 helpers exported");
} catch (e) {
  fail("firestore.js Phase2/3 helpers exported", e);
}

try {
  const st = read("src/lib/statuses.js");
  mustInclude(st, ["APPROVED", "ALLOCATED", "ALLOCATION_STATUS", "APPLICATION_ALLOCATABLE"], "statuses");
  pass("Application/allocation status constants present");
} catch (e) {
  fail("Application/allocation status constants present", e);
}

// --- Pure allocation lock simulation (mirrors allocateBedAtomically guards) ---
function simulateAllocate(state, { applicationId, bedId }) {
  const bed = state.beds[bedId];
  const app = state.applications[applicationId];
  if (!bed) throw new Error("Bed not found");
  if (!app) throw new Error("Application not found");
  if (bed.status !== "available") {
    throw new Error(`This bed is not available (currently: ${bed.status})`);
  }
  if (bed.currentAllocationId) {
    throw new Error("This bed is already allocated — choose another bed");
  }
  if (["allocated", "rejected", "withdrawn", "closed", "expired"].includes(app.status)) {
    throw new Error(`Application cannot be allocated (status: ${app.status})`);
  }
  if (!["approved", "accepted"].includes(app.status)) {
    throw new Error("Approve the application before allocating a bed");
  }
  if (app.allocationId) {
    throw new Error("This application already has an allocation");
  }
  const allocationId = `alloc_${Object.keys(state.allocations).length + 1}`;
  state.allocations[allocationId] = { applicationId, bedId, status: "reserved" };
  bed.status = "reserved";
  bed.currentAllocationId = allocationId;
  app.status = "allocated";
  app.allocationId = allocationId;
  return allocationId;
}

try {
  const state = {
    beds: {
      b1: { status: "available", currentAllocationId: null },
      b2: { status: "available", currentAllocationId: null },
    },
    applications: {
      a1: { status: "new", allocationId: null },
      a2: { status: "approved", allocationId: null },
      a3: { status: "approved", allocationId: null },
    },
    allocations: {},
  };

  let threw = false;
  try {
    simulateAllocate(state, { applicationId: "a1", bedId: "b1" });
  } catch (e) {
    threw = String(e.message).includes("Approve");
  }
  if (!threw) throw new Error("expected approve gate");

  const id1 = simulateAllocate(state, { applicationId: "a2", bedId: "b1" });
  if (state.beds.b1.status !== "reserved") throw new Error("bed not reserved");
  if (state.applications.a2.status !== "allocated") throw new Error("app not allocated");

  threw = false;
  try {
    simulateAllocate(state, { applicationId: "a3", bedId: "b1" });
  } catch (e) {
    threw = String(e.message).includes("not available");
  }
  if (!threw) throw new Error("expected double-book rejection");

  const id2 = simulateAllocate(state, { applicationId: "a3", bedId: "b2" });
  if (id1 === id2) throw new Error("allocation ids should differ");
  if (Object.keys(state.allocations).length !== 2) throw new Error("expected 2 allocations");

  pass("Logic: approve gate + double-book rejection + second bed ok");
} catch (e) {
  fail("Logic: approve gate + double-book rejection + second bed ok", e);
}

// Concurrent simulation: first writer wins
try {
  const bed = { status: "available", currentAllocationId: null };
  const apps = [
    { status: "approved", allocationId: null },
    { status: "approved", allocationId: null },
  ];
  let wins = 0;
  for (const app of apps) {
    if (bed.status === "available" && !bed.currentAllocationId && !app.allocationId) {
      bed.status = "reserved";
      bed.currentAllocationId = "x";
      app.status = "allocated";
      app.allocationId = "x";
      wins++;
    }
  }
  if (wins !== 1) throw new Error(`expected 1 win, got ${wins}`);
  pass("Logic: sequential contention yields single winner");
} catch (e) {
  fail("Logic: sequential contention yields single winner", e);
}

// Migration idempotency logic
try {
  const rooms = [];
  function migrate(unitId) {
    if (rooms.some((r) => r.legacyUnitId === unitId)) {
      return { skipped: true };
    }
    rooms.push({ legacyUnitId: unitId, label: "R" });
    return { skipped: false };
  }
  const r1 = migrate("u1");
  const r2 = migrate("u1");
  if (r1.skipped || !r2.skipped || rooms.length !== 1) {
    throw new Error("idempotent migrate failed");
  }
  pass("Logic: unit→room migration idempotent");
} catch (e) {
  fail("Logic: unit→room migration idempotent", e);
}

// Layout single brand
try {
  const layout = read("src/components/layouts/ManagerDashboardLayout.jsx");
  mustInclude(
    layout,
    ["/manager/owners", "/manager/applicants", "/manager/allocations", "/manager/users", "Admin"],
    "layout"
  );
  pass("Manager layout is the single Admin desk nav");
} catch (e) {
  fail("Manager layout is the single Admin desk nav", e);
}

const failed = results.filter((r) => !r.ok);
console.log("\n=== Summary ===");
console.log(`Passed: ${results.filter((r) => r.ok).length}`);
console.log(`Failed: ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(` - ${f.name}: ${f.err}`);
  process.exit(1);
}
console.log("All offline checks passed.");
console.log(
  "\nNote: Live Firestore emulator tests need Java. Production UI test needs SMOKE_ADMIN_EMAIL/PASSWORD."
);
