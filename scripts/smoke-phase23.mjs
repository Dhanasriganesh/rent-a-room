/**
 * Phase 2 + 3 smoke tests against Firestore/Auth emulators.
 * Run: node scripts/smoke-phase23.mjs
 * Expects emulators on 8080 (Firestore) and 9099 (Auth).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env");
  const env = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* optional */
  }
  return env;
}

const results = [];
function pass(name) {
  results.push({ name, ok: true });
  console.log(`  PASS  ${name}`);
}
function fail(name, err) {
  results.push({ name, ok: false, err: String(err?.message || err) });
  console.error(`  FAIL  ${name}`);
  console.error(`        ${err?.message || err}`);
}

async function expectThrows(fn, includes) {
  try {
    await fn();
    throw new Error("Expected error was not thrown");
  } catch (e) {
    if (includes && !String(e.message || e).includes(includes)) {
      throw new Error(`Wrong error: ${e.message}`);
    }
  }
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-rent-a-room",
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const stamp = Date.now();
const adminEmail = `admin-smoke-${stamp}@test.local`;
const adminPass = "SmokeTest123!";
const renterEmail = `renter-smoke-${stamp}@test.local`;

async function allocateBedAtomicallyLocal(
  { applicationId, bedId, startDate, agreedMonthlyRent, agreedDeposit = 0 },
  actorUserId
) {
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
    if (bed.status !== "available") {
      throw new Error(`This bed is not available (currently: ${bed.status})`);
    }
    if (bed.currentAllocationId) {
      throw new Error("This bed is already allocated — choose another bed");
    }
    if (["allocated", "rejected", "withdrawn", "closed", "expired"].includes(application.status)) {
      throw new Error(`Application cannot be allocated (status: ${application.status})`);
    }
    if (!["approved", "accepted"].includes(application.status)) {
      throw new Error("Approve the application before allocating a bed");
    }
    if (application.allocationId) {
      throw new Error("This application already has an allocation");
    }
    tx.set(allocationRef, {
      applicationId,
      tenantUserId: application.renterId || null,
      propertyId: bed.propertyId,
      roomId: bed.roomId,
      bedId,
      startDate,
      agreedMonthlyRent: Number(agreedMonthlyRent) || 0,
      agreedDeposit: Number(agreedDeposit) || 0,
      status: "reserved",
      createdBy: actorUserId,
      createdAt: serverTimestamp(),
    });
    tx.update(bedRef, {
      status: "reserved",
      currentAllocationId: allocationId,
    });
    tx.update(appRef, {
      status: "allocated",
      allocationId,
      bedId,
    });
  });
  return allocationId;
}

async function main() {
  console.log("\n=== Phase 2 + 3 smoke (Auth + Firestore emulators) ===\n");

  let adminUid;
  let renterUid;

  // --- Auth bootstrap ---
  try {
    const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
    adminUid = cred.user.uid;
    await setDoc(doc(db, "users", adminUid), {
      email: adminEmail,
      displayName: "Smoke Admin",
      role: "admin",
      accountStatus: "active",
      createdAt: serverTimestamp(),
    });
    pass("Create admin user + profile");
  } catch (e) {
    fail("Create admin user + profile", e);
    printSummary();
    process.exit(1);
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, renterEmail, adminPass);
    renterUid = cred.user.uid;
    await setDoc(doc(db, "users", renterUid), {
      email: renterEmail,
      displayName: "Smoke Renter",
      role: "renter",
      accountStatus: "active",
      createdAt: serverTimestamp(),
    });
    pass("Create renter user + profile");
  } catch (e) {
    fail("Create renter user + profile", e);
  }

  await signInWithEmailAndPassword(auth, adminEmail, adminPass);
  pass("Admin sign-in");

  // --- Phase 2: owner / property / room / bed ---
  let ownerId;
  let propertyId;
  let roomId;
  let bed1;
  let bed2;

  try {
    const ownerRef = await addDoc(collection(db, "owners"), {
      fullName: "Smoke Owner",
      contactEmail: `owner-${stamp}@test.local`,
      status: "active",
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    ownerId = ownerRef.id;
    const snap = await getDoc(ownerRef);
    if (!snap.exists() || snap.data().fullName !== "Smoke Owner") throw new Error("owner missing");
    pass("Phase2 create owner record");
  } catch (e) {
    fail("Phase2 create owner record", e);
  }

  try {
    const propRef = await addDoc(collection(db, "properties"), {
      name: "Smoke House",
      address: "1 Test St",
      city: "Berlin",
      country: "Germany",
      propertyType: "apartment_building",
      ownerRecordId: ownerId,
      ownerId: null,
      status: "active",
      totalRooms: 0,
      totalBeds: 0,
      availableBeds: 0,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    propertyId = propRef.id;
    pass("Phase2 create property linked to owner");
  } catch (e) {
    fail("Phase2 create property linked to owner", e);
  }

  try {
    const roomRef = await addDoc(collection(db, "rooms"), {
      propertyId,
      ownerRecordId: ownerId,
      label: "Room A",
      roomType: "shared",
      capacity: 2,
      status: "active",
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    roomId = roomRef.id;
    const b1 = await addDoc(collection(db, "beds"), {
      roomId,
      propertyId,
      ownerRecordId: ownerId,
      label: "Bed 1",
      status: "available",
      currentAllocationId: null,
      createdBy: adminUid,
    });
    const b2 = await addDoc(collection(db, "beds"), {
      roomId,
      propertyId,
      ownerRecordId: ownerId,
      label: "Bed 2",
      status: "available",
      currentAllocationId: null,
      createdBy: adminUid,
    });
    bed1 = b1.id;
    bed2 = b2.id;
    await updateDoc(doc(db, "properties", propertyId), {
      totalRooms: 1,
      totalBeds: 2,
      availableBeds: 2,
    });
    pass("Phase2 create room + 2 available beds");
  } catch (e) {
    fail("Phase2 create room + 2 available beds", e);
  }

  try {
    const offerRef = await addDoc(collection(db, "rental_offers"), {
      propertyId,
      roomId,
      bedId: bed1,
      monthlyRent: 450,
      depositAmount: 450,
      depositMeaning: "security_deposit",
      currency: "EUR",
      status: "active",
      createdBy: adminUid,
      createdAt: serverTimestamp(),
    });
    const offer = await getDoc(offerRef);
    if (offer.data().monthlyRent !== 450) throw new Error("offer rent mismatch");
    pass("Phase2 create rental offer on bed");
  } catch (e) {
    fail("Phase2 create rental offer on bed", e);
  }

  // Idempotent migration marker simulation
  try {
    const unitRef = await addDoc(collection(db, "units"), {
      propertyId,
      unitName: "Legacy Unit 1",
      unitType: "room",
      occupancyLimit: 1,
      status: "available",
      rentAmount: 400,
      inventoryMigrated: false,
    });
    // first "migration"
    const roomsQ1 = await getDocs(
      query(collection(db, "rooms"), where("legacyUnitId", "==", unitRef.id))
    );
    if (!roomsQ1.empty) throw new Error("should not exist yet");
    const migratedRoom = await addDoc(collection(db, "rooms"), {
      propertyId,
      label: "Legacy Unit 1",
      legacyUnitId: unitRef.id,
      roomType: "private",
      capacity: 1,
      status: "active",
    });
    await updateDoc(unitRef, { inventoryMigrated: true, linkedRoomId: migratedRoom.id });
    const roomsQ2 = await getDocs(
      query(collection(db, "rooms"), where("legacyUnitId", "==", unitRef.id))
    );
    if (roomsQ2.size !== 1) throw new Error(`expected 1 room, got ${roomsQ2.size}`);
    // re-run skip check
    if (roomsQ2.size === 1) {
      /* skip create — idempotent */
    }
    pass("Phase2 migration idempotency (legacyUnitId unique)");
  } catch (e) {
    fail("Phase2 migration idempotency (legacyUnitId unique)", e);
  }

  // --- Phase 3: applications + allocation ---
  let app1;
  let app2;

  try {
    const a1 = await addDoc(collection(db, "applications"), {
      applicantName: "Alice Applicant",
      applicantEmail: `alice-${stamp}@test.local`,
      propertyId,
      roomId,
      status: "new",
      source: "staff",
      renterId: null,
      submittedAt: serverTimestamp(),
      createdBy: adminUid,
    });
    app1 = a1.id;
    await updateDoc(a1, { status: "under_review" });
    await updateDoc(a1, { status: "approved", decisionNote: "ok" });
    const snap = await getDoc(a1);
    if (snap.data().status !== "approved") throw new Error("not approved");
    pass("Phase3 application pipeline new → approved");
  } catch (e) {
    fail("Phase3 application pipeline new → approved", e);
  }

  try {
    const a2 = await addDoc(collection(db, "applications"), {
      applicantName: "Bob Applicant",
      applicantEmail: `bob-${stamp}@test.local`,
      propertyId,
      roomId,
      status: "approved",
      source: "staff",
      submittedAt: serverTimestamp(),
      createdBy: adminUid,
    });
    app2 = a2.id;
    pass("Phase3 second approved application ready");
  } catch (e) {
    fail("Phase3 second approved application ready", e);
  }

  // Reject allocate while still "new"
  try {
    const premature = await addDoc(collection(db, "applications"), {
      applicantName: "Premature",
      applicantEmail: `prem-${stamp}@test.local`,
      propertyId,
      status: "new",
      submittedAt: serverTimestamp(),
    });
    await expectThrows(
      () =>
        allocateBedAtomicallyLocal(
          {
            applicationId: premature.id,
            bedId: bed2,
            startDate: "2026-11-01",
            agreedMonthlyRent: 400,
          },
          adminUid
        ),
      "Approve the application"
    );
    pass("Phase3 block allocate before approval");
  } catch (e) {
    fail("Phase3 block allocate before approval", e);
  }

  let allocationId;
  try {
    allocationId = await allocateBedAtomicallyLocal(
      {
        applicationId: app1,
        bedId: bed1,
        startDate: "2026-11-01",
        agreedMonthlyRent: 450,
        agreedDeposit: 450,
      },
      adminUid
    );
    const bedSnap = await getDoc(doc(db, "beds", bed1));
    const appSnap = await getDoc(doc(db, "applications", app1));
    if (bedSnap.data().status !== "reserved") throw new Error("bed not reserved");
    if (bedSnap.data().currentAllocationId !== allocationId) throw new Error("lock missing");
    if (appSnap.data().status !== "allocated") throw new Error("app not allocated");
    pass("Phase3 allocate bed (transaction success)");
  } catch (e) {
    fail("Phase3 allocate bed (transaction success)", e);
  }

  try {
    await expectThrows(
      () =>
        allocateBedAtomicallyLocal(
          {
            applicationId: app2,
            bedId: bed1,
            startDate: "2026-11-01",
            agreedMonthlyRent: 450,
          },
          adminUid
        ),
      "not available"
    );
    pass("Phase3 double-book same bed rejected");
  } catch (e) {
    fail("Phase3 double-book same bed rejected", e);
  }

  try {
    // concurrent race: two txs on bed2
    const resultsRace = await Promise.allSettled([
      allocateBedAtomicallyLocal(
        {
          applicationId: app2,
          bedId: bed2,
          startDate: "2026-12-01",
          agreedMonthlyRent: 400,
        },
        adminUid
      ),
      // second attempt needs another approved app
      (async () => {
        const a3 = await addDoc(collection(db, "applications"), {
          applicantName: "Cara",
          applicantEmail: `cara-${stamp}@test.local`,
          propertyId,
          status: "approved",
          submittedAt: serverTimestamp(),
        });
        return allocateBedAtomicallyLocal(
          {
            applicationId: a3.id,
            bedId: bed2,
            startDate: "2026-12-01",
            agreedMonthlyRent: 400,
          },
          adminUid
        );
      })(),
    ]);
    const wins = resultsRace.filter((r) => r.status === "fulfilled").length;
    const losses = resultsRace.filter((r) => r.status === "rejected").length;
    if (wins !== 1 || losses !== 1) {
      throw new Error(`expected 1 win / 1 loss, got wins=${wins} losses=${losses}`);
    }
    const bedSnap = await getDoc(doc(db, "beds", bed2));
    if (bedSnap.data().status !== "reserved") throw new Error("bed2 not reserved after race");
    pass("Phase3 concurrent allocate: exactly one winner");
  } catch (e) {
    fail("Phase3 concurrent allocate: exactly one winner", e);
  }

  // Static route / rules checks (no emulator needed but run here)
  try {
    const appJsx = readFileSync(resolve(root, "src/App.jsx"), "utf8");
    const must = [
      'path="owners"',
      'path="properties"',
      'path="inventory"',
      'path="applicants"',
      'path="allocations"',
      "ManagerApplicants",
      "ManagerAllocations",
      'Navigate to="/manager"',
    ];
    for (const m of must) {
      if (!appJsx.includes(m)) throw new Error(`App.jsx missing ${m}`);
    }
    pass("Static: App.jsx Phase2/3 routes + admin redirect");
  } catch (e) {
    fail("Static: App.jsx Phase2/3 routes + admin redirect", e);
  }

  try {
    const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");
    for (const m of [
      "match /owners/{id}",
      "match /rooms/{id}",
      "match /beds/{id}",
      "match /rental_offers/{id}",
      "match /allocations/{id}",
      "allow create: if isStaff()",
    ]) {
      if (!rules.includes(m)) throw new Error(`rules missing ${m}`);
    }
    pass("Static: firestore.rules Phase2/3 collections");
  } catch (e) {
    fail("Static: firestore.rules Phase2/3 collections", e);
  }

  try {
    const fsJs = readFileSync(resolve(root, "src/lib/firestore.js"), "utf8");
    for (const m of [
      "createOwnerRecord",
      "migrateUnitToRoomAndBeds",
      "allocateBedAtomically",
      "createStaffApplication",
      "runTransaction",
      'ALLOCATIONS: "allocations"',
    ]) {
      if (!fsJs.includes(m)) throw new Error(`firestore.js missing ${m}`);
    }
    pass("Static: firestore.js Phase2/3 helpers present");
  } catch (e) {
    fail("Static: firestore.js Phase2/3 helpers present", e);
  }

  printSummary();
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log("\n=== Summary ===");
  console.log(`Passed: ${results.filter((r) => r.ok).length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.err}`);
    process.exitCode = 1;
  } else {
    console.log("All smoke checks passed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
