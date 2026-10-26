/**
 * Emulator smoke for Phases 4–5–6–7–8–9 (contracts, rent, inbox, WA, lifecycle, hardening).
 * Requires Auth 9099 + Firestore 8080 (open rules ok — use firebase.smoke.json).
 * node scripts/smoke-phases489.mjs
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
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* */
  }
  return env;
}

const results = [];
function pass(name) {
  results.push({ ok: true, name });
  console.log(`  PASS  ${name}`);
}
function fail(name, err) {
  results.push({ ok: false, name, err: String(err?.message || err) });
  console.error(`  FAIL  ${name}\n        ${err?.message || err}`);
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
const email = `smoke489_${stamp}@example.com`;
const password = "SmokeTest!489";

async function main() {
  console.log("\n=== Emulator smoke Phases 4–9 ===\n");

  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    await setDoc(doc(db, "users", uid), {
      email,
      role: "admin",
      displayName: "Smoke Admin 489",
      createdAt: serverTimestamp(),
    });
    pass("Auth admin user");
  } catch (e) {
    fail("Auth admin user", e);
    summarize();
    return;
  }

  let propertyId, roomId, bedId, allocationId, contractId, chargeId, conversationId, moveInId, ticketId;

  try {
    const p = await addDoc(collection(db, "properties"), {
      name: `Smoke Prop ${stamp}`,
      city: "Berlin",
      ownerRecordId: null,
      status: "active",
      createdAt: serverTimestamp(),
    });
    propertyId = p.id;
    const r = await addDoc(collection(db, "rooms"), {
      propertyId,
      label: "R1",
      status: "active",
      createdAt: serverTimestamp(),
    });
    roomId = r.id;
    const b = await addDoc(collection(db, "beds"), {
      propertyId,
      roomId,
      label: "B1",
      status: "available",
      createdAt: serverTimestamp(),
    });
    bedId = b.id;
    pass("P2 inventory seed");
  } catch (e) {
    fail("P2 inventory seed", e);
  }

  try {
    const a = await addDoc(collection(db, "allocations"), {
      propertyId,
      roomId,
      bedId,
      tenantUserId: uid,
      applicantName: "Smoke Tenant",
      status: "reserved",
      startDate: "2026-11-01",
      monthlyRent: 500,
      currency: "EUR",
      createdAt: serverTimestamp(),
    });
    allocationId = a.id;
    await updateDoc(doc(db, "beds", bedId), { status: "reserved", currentAllocationId: allocationId });
    pass("P3 allocation seed");
  } catch (e) {
    fail("P3 allocation seed", e);
  }

  // Phase 4 — contract draft
  try {
    const c = await addDoc(collection(db, "contracts"), {
      allocationId,
      propertyId,
      roomId,
      bedId,
      tenantUserId: uid,
      status: "draft",
      bodyHtml: "<p>DEMO — NOT A LEGAL CONTRACT</p>",
      startDate: "2026-11-01",
      endDate: "2027-10-31",
      monthlyRent: 500,
      currency: "EUR",
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    contractId = c.id;
    await updateDoc(doc(db, "contracts", contractId), {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: uid,
    });
    await updateDoc(doc(db, "contracts", contractId), {
      status: "issued",
      issuedAt: serverTimestamp(),
      issuedBy: uid,
    });
    const snap = await getDoc(doc(db, "contracts", contractId));
    if (snap.data().status !== "issued") throw new Error("contract not issued");
    pass("P4 contract draft→approved→issued");
  } catch (e) {
    fail("P4 contract draft→approved→issued", e);
  }

  // Phase 5 — rent charge + payment
  try {
    const periodKey = "2026-11";
    const ch = await addDoc(collection(db, "rent_charges"), {
      allocationId,
      propertyId,
      periodKey,
      amountDue: 500,
      paidAmount: 0,
      currency: "EUR",
      status: "due",
      dueDate: "2026-11-01",
      createdAt: serverTimestamp(),
      idempotencyKey: `rent:${allocationId}:${periodKey}`,
    });
    chargeId = ch.id;
    // duplicate idempotency check (client-side pattern)
    const dupQ = await getDocs(
      query(collection(db, "rent_charges"), where("idempotencyKey", "==", `rent:${allocationId}:${periodKey}`))
    );
    if (dupQ.size !== 1) throw new Error(`expected 1 charge, got ${dupQ.size}`);
    await addDoc(collection(db, "payments"), {
      chargeId,
      allocationId,
      amount: 500,
      method: "bank_transfer",
      status: "succeeded",
      recordedBy: uid,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "rent_charges", chargeId), {
      paidAmount: 500,
      status: "paid",
    });
    pass("P5 rent charge + payment + idempotency key unique");
  } catch (e) {
    fail("P5 rent charge + payment + idempotency key unique", e);
  }

  // Phase 6 — website conversation + sandbox email log
  try {
    const conv = await addDoc(collection(db, "conversations"), {
      channel: "website",
      status: "open",
      handoverState: "human",
      guestName: "Guest",
      guestEmail: `guest_${stamp}@example.com`,
      participantIds: [],
      lastMessage: "Is a room free?",
      lastMessageAt: serverTimestamp(),
      unreadForStaff: true,
      createdAt: serverTimestamp(),
    });
    conversationId = conv.id;
    await addDoc(collection(db, "messages"), {
      conversationId,
      senderType: "guest",
      body: "Is a room free?",
      participantIds: [],
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, "message_delivery_logs"), {
      channel: "email",
      mode: "sandbox",
      status: "logged",
      to: "desk@sandbox.local",
      idempotencyKey: `enquiry-notify:${conversationId}:${stamp}`,
      createdAt: serverTimestamp(),
    });
    pass("P6 website thread + sandbox email log");
  } catch (e) {
    fail("P6 website thread + sandbox email log", e);
  }

  // Phase 7 — WhatsApp sandbox settings + delivery log (never live)
  try {
    await setDoc(
      doc(db, "platform_settings", "whatsapp"),
      {
        mode: "sandbox",
        productionApproved: false,
        checklist: {},
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    const wa = await getDoc(doc(db, "platform_settings", "whatsapp"));
    if (wa.data().productionApproved) throw new Error("productionApproved should be false");
    await addDoc(collection(db, "message_delivery_logs"), {
      channel: "whatsapp",
      mode: "sandbox",
      status: "logged",
      toE164: "+4915112345678",
      body: "sandbox test",
      idempotencyKey: `wa-test:${stamp}`,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, "whatsapp_webhook_events"), {
      simulated: true,
      payload: { entry: [] },
      createdAt: serverTimestamp(),
    });
    pass("P7 WhatsApp sandbox settings + webhook event (no live)");
  } catch (e) {
    fail("P7 WhatsApp sandbox settings + webhook event (no live)", e);
  }

  // Phase 8 — maintenance + move-in checklist complete
  try {
    const t = await addDoc(collection(db, "requests"), {
      title: "Leaky tap",
      category: "plumbing",
      urgency: "medium",
      status: "new",
      source: "staff",
      allocationId,
      propertyId,
      statusHistory: [{ from: null, to: "new", at: new Date().toISOString(), by: uid }],
      createdAt: serverTimestamp(),
    });
    ticketId = t.id;
    await updateDoc(doc(db, "requests", ticketId), {
      status: "in_progress",
      statusHistory: [
        { from: null, to: "new", at: new Date().toISOString(), by: uid },
        { from: "new", to: "in_progress", at: new Date().toISOString(), by: uid },
      ],
    });

    const checklist = {
      contract_checked: { done: true, at: new Date().toISOString(), by: uid },
      signatures_recorded: { done: true, at: new Date().toISOString(), by: uid },
      allocation_confirmed: { done: true, at: new Date().toISOString(), by: uid },
      deposit_recorded: { done: true, at: new Date().toISOString(), by: uid },
      keys_handover: { done: true, at: new Date().toISOString(), by: uid },
      condition_checklist: { done: true, at: new Date().toISOString(), by: uid },
      instructions_sent: { done: true, at: new Date().toISOString(), by: uid },
    };
    const mv = await addDoc(collection(db, "move_events"), {
      type: "move_in",
      status: "in_progress",
      allocationId,
      propertyId,
      roomId,
      bedId,
      checklist,
      legalFlags: [],
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    moveInId = mv.id;
    const incomplete = Object.values(checklist).filter((i) => !i.done);
    if (incomplete.length) throw new Error("checklist incomplete");
    await updateDoc(doc(db, "move_events", moveInId), {
      status: "completed",
      completedAt: serverTimestamp(),
      completedBy: uid,
    });
    await updateDoc(doc(db, "allocations", allocationId), { status: "active" });
    await updateDoc(doc(db, "beds", bedId), { status: "occupied" });
    pass("P8 maintenance ticket + move-in complete");
  } catch (e) {
    fail("P8 maintenance ticket + move-in complete", e);
  }

  // Phase 9 — hardening flags
  try {
    await setDoc(
      doc(db, "platform_settings", "hardening"),
      {
        maintenanceMode: false,
        publicApplyEnabled: true,
        publicChatEnabled: true,
        emailMode: "sandbox",
        securityChecklist: { rulesDeployed: { done: true, at: new Date().toISOString() } },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    const h = await getDoc(doc(db, "platform_settings", "hardening"));
    if (h.data().emailMode !== "sandbox") throw new Error("emailMode");
    // Toggle maintenance then restore
    await updateDoc(doc(db, "platform_settings", "hardening"), { maintenanceMode: true });
    await updateDoc(doc(db, "platform_settings", "hardening"), { maintenanceMode: false });
    pass("P9 hardening settings read/write");
  } catch (e) {
    fail("P9 hardening settings read/write", e);
  }

  // Lightweight cleanup (best-effort)
  try {
    const ids = [
      ["contracts", contractId],
      ["rent_charges", chargeId],
      ["move_events", moveInId],
      ["requests", ticketId],
      ["conversations", conversationId],
      ["allocations", allocationId],
      ["beds", bedId],
      ["rooms", roomId],
      ["properties", propertyId],
    ];
    for (const [col, id] of ids) {
      if (id) await deleteDoc(doc(db, col, id)).catch(() => {});
    }
    pass("Cleanup smoke docs");
  } catch (e) {
    fail("Cleanup smoke docs", e);
  }

  summarize();
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===\n`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.err}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
