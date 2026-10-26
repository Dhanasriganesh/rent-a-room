/**
 * Create / elevate the superadmin Auth user + Firestore profile (role: admin).
 *
 * Usage:
 *   node scripts/seed-superadmin.mjs
 *
 * Defaults (override with env):
 *   SUPERADMIN_EMAIL=superadmin@gmail.com
 *   SUPERADMIN_PASSWORD=Superadmin@123
 *
 * Requires .env with VITE_FIREBASE_* for the live project.
 * Needs firestore.rules allowing superadminEmailElevate() (deploy rules first).
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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
const EMAIL = (env.SUPERADMIN_EMAIL || "superadmin@gmail.com").trim().toLowerCase();
const PASSWORD = env.SUPERADMIN_PASSWORD || "Superadmin@123";
const DISPLAY = env.SUPERADMIN_NAME || "Superadmin";

if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID) {
  console.error("Missing VITE_FIREBASE_* in .env");
  process.exit(1);
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

async function main() {
  console.log(`\nSeeding superadmin: ${EMAIL} (project ${env.VITE_FIREBASE_PROJECT_ID})\n`);

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    console.log("  Auth user created");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      console.log("  Auth user already exists — signed in");
    } else {
      throw err;
    }
  }

  const uid = cred.user.uid;
  await updateProfile(cred.user, { displayName: DISPLAY }).catch(() => {});

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: EMAIL,
      displayName: DISPLAY,
      phone: "",
      city: "",
      role: "renter",
      accountStatus: "active",
      emailVerified: true,
      notificationPreferences: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("  Firestore profile created (temp role: renter)");
  }

  await updateDoc(ref, {
    role: "admin",
    accountStatus: "active",
    displayName: DISPLAY,
    email: EMAIL,
    updatedAt: serverTimestamp(),
  });
  console.log("  Role set to admin (superadmin)");

  const staffRef = doc(db, "staff_profiles", uid);
  await setDoc(
    staffRef,
    {
      userId: uid,
      displayName: DISPLAY,
      email: EMAIL,
      title: "Superadmin",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  console.log("  staff_profiles upserted");

  await signOut(auth);
  console.log(`\nDone. Sign in at: /superadmin/login`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: (the value you set / default seed password)\n`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.code || "", err.message || err);
  if (String(err.message || "").includes("permission") || err.code === "permission-denied") {
    console.error(
      "\nDeploy rules first:\n  npx firebase-tools deploy --only firestore:rules --project " +
        (env.VITE_FIREBASE_PROJECT_ID || "rentalrooms-50a77")
    );
  }
  process.exit(1);
});
