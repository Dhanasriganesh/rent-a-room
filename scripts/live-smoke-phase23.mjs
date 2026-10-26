/**
 * Live Firebase smoke (production project from .env).
 * Requires env: SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD
 * node scripts/live-smoke-phase23.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  deleteDoc,
} from "firebase/firestore";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && env[m[1].trim()] === undefined) env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* */
  }
  return env;
}

const env = loadEnv();
const email = env.SMOKE_ADMIN_EMAIL;
const password = env.SMOKE_ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD to run live smoke.");
  process.exit(2);
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
const stamp = Date.now();
const created = [];

async function allocate({ applicationId, bedId, startDate, rent }, uid) {
  const allocationRef = doc(collection(db, "allocations"));
  const allocationId = allocationRef.id;
  await runTransaction(db, async (tx) => {
    const bedRef = doc(db, "beds", bedId);
    const appRef = doc(db, "applications", applicationId);
    const [bedSnap, appSnap] = await Promise.all([tx.get(bedRef), tx.get(appRef)]);
    if (!bedSnap.exists()) throw new Error("Bed not found");
    if (!appSnap.exists()) throw new Error("Application not found");
    const bed = bedSnap.data();
    const application = appSnap.data();
    if (bed.status !== "available" || bed.currentAllocationId) {
      throw new Error(`This bed is not available (currently: ${bed.status})`);
    }
    if (!["approved", "accepted"].includes(application.status)) {
      throw new Error("Approve the application before allocating a bed");
    }
    tx.set(allocationRef, {
      applicationId,
      propertyId: bed.propertyId,
      roomId: bed.roomId,
      bedId,
      startDate,
      agreedMonthlyRent: rent,
      status: "reserved",
      createdBy: uid,
      smokeTest: true,
      createdAt: serverTimestamp(),
    });
    tx.update(bedRef, { status: "reserved", currentAllocationId: allocationId });
    tx.update(appRef, { status: "allocated", allocationId, bedId });
  });
  created.push(["allocations", allocationId]);
  return allocationId;
}

const results = [];
const pass = (n) => {
  results.push({ ok: true, n });
  console.log(`  PASS  ${n}`);
};
const fail = (n, e) => {
  results.push({ ok: false, n, e: e.message || String(e) });
  console.error(`  FAIL  ${n}: ${e.message || e}`);
};

async function cleanup() {
  console.log("\nCleaning smoke docs...");
  for (const [col, id] of created.reverse()) {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (e) {
      console.warn(`  could not delete ${col}/${id}: ${e.message}`);
    }
  }
}

async function main() {
  console.log("\n=== Live Phase 2+3 smoke ===\n");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const profile = await getDoc(doc(db, "users", uid));
  if (!profile.exists()) throw new Error("No users/{uid} profile");
  if (!["admin", "property_manager"].includes(profile.data().role)) {
    throw new Error(`Need admin role, got ${profile.data().role}`);
  }
  pass(`Signed in as ${profile.data().role}`);

  let ownerId, propertyId, roomId, bed1, bed2, app1, app2;

  try {
    const ref = await addDoc(collection(db, "owners"), {
      fullName: `Smoke Owner ${stamp}`,
      contactEmail: `smoke-owner-${stamp}@example.com`,
      status: "active",
      createdBy: uid,
      smokeTest: true,
      createdAt: serverTimestamp(),
    });
    ownerId = ref.id;
    created.push(["owners", ownerId]);
    pass("Create owner");
  } catch (e) {
    fail("Create owner", e);
  }

  try {
    const ref = await addDoc(collection(db, "properties"), {
      name: `Smoke Property ${stamp}`,
      address: "Smoke St 1",
      city: "Berlin",
      country: "Germany",
      propertyType: "apartment_building",
      ownerRecordId: ownerId,
      status: "active",
      totalRooms: 0,
      totalBeds: 0,
      availableBeds: 0,
      createdBy: uid,
      smokeTest: true,
      createdAt: serverTimestamp(),
    });
    propertyId = ref.id;
    created.push(["properties", propertyId]);
    pass("Create property");
  } catch (e) {
    fail("Create property", e);
  }

  try {
    const room = await addDoc(collection(db, "rooms"), {
      propertyId,
      ownerRecordId: ownerId,
      label: "Smoke Room",
      roomType: "shared",
      capacity: 2,
      status: "active",
      smokeTest: true,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    roomId = room.id;
    created.push(["rooms", roomId]);
    const b1 = await addDoc(collection(db, "beds"), {
      roomId,
      propertyId,
      label: "Bed 1",
      status: "available",
      currentAllocationId: null,
      smokeTest: true,
      createdBy: uid,
    });
    const b2 = await addDoc(collection(db, "beds"), {
      roomId,
      propertyId,
      label: "Bed 2",
      status: "available",
      currentAllocationId: null,
      smokeTest: true,
      createdBy: uid,
    });
    bed1 = b1.id;
    bed2 = b2.id;
    created.push(["beds", bed1], ["beds", bed2]);
    pass("Create room + beds");
  } catch (e) {
    fail("Create room + beds", e);
  }

  try {
    const a1 = await addDoc(collection(db, "applications"), {
      applicantName: "Smoke Alice",
      applicantEmail: `alice-${stamp}@example.com`,
      propertyId,
      roomId,
      status: "new",
      source: "staff",
      smokeTest: true,
      createdBy: uid,
      submittedAt: serverTimestamp(),
    });
    app1 = a1.id;
    created.push(["applications", app1]);
    await updateDoc(a1, { status: "approved" });
    const a2 = await addDoc(collection(db, "applications"), {
      applicantName: "Smoke Bob",
      applicantEmail: `bob-${stamp}@example.com`,
      propertyId,
      roomId,
      status: "approved",
      source: "staff",
      smokeTest: true,
      createdBy: uid,
      submittedAt: serverTimestamp(),
    });
    app2 = a2.id;
    created.push(["applications", app2]);
    pass("Create + approve applications");
  } catch (e) {
    fail("Create + approve applications", e);
  }

  try {
    await allocate({ applicationId: app1, bedId: bed1, startDate: "2026-11-01", rent: 500 }, uid);
    const bed = await getDoc(doc(db, "beds", bed1));
    if (bed.data().status !== "reserved") throw new Error("bed not reserved");
    pass("Allocate bed1 to Alice");
  } catch (e) {
    fail("Allocate bed1 to Alice", e);
  }

  try {
    let rejected = false;
    try {
      await allocate({ applicationId: app2, bedId: bed1, startDate: "2026-11-01", rent: 500 }, uid);
    } catch (e) {
      rejected = String(e.message).includes("not available");
    }
    if (!rejected) throw new Error("double-book was allowed");
    pass("Double-book bed1 rejected");
  } catch (e) {
    fail("Double-book bed1 rejected", e);
  }

  try {
    await allocate({ applicationId: app2, bedId: bed2, startDate: "2026-11-01", rent: 480 }, uid);
    pass("Allocate bed2 to Bob");
  } catch (e) {
    fail("Allocate bed2 to Bob", e);
  }

  await cleanup();

  const failed = results.filter((r) => !r.ok);
  console.log("\n=== Summary ===");
  console.log(`Passed: ${results.filter((r) => r.ok).length}  Failed: ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await cleanup();
  } catch {
    /* */
  }
  process.exit(1);
});
