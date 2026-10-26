/**
 * Set a user's Firestore role by email (must sign in as an existing admin).
 *
 * Usage:
 *   node scripts/set-role-by-email.mjs admin@rentals.com property_manager
 *
 * Env (from .env):
 *   SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD — account with role admin
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
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
const targetEmail = (process.argv[2] || "").trim().toLowerCase();
const targetRole = (process.argv[3] || "property_manager").trim();
const allowed = ["admin", "property_manager", "owner", "renter"];

if (!targetEmail || !allowed.includes(targetRole)) {
  console.error(
    "Usage: node scripts/set-role-by-email.mjs <email> <admin|property_manager|owner|renter>"
  );
  process.exit(1);
}

const ADMIN_EMAIL = (env.SUPERADMIN_EMAIL || "superadmin@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = env.SUPERADMIN_PASSWORD || "Superadmin@123";

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
  console.log(`\nSet role for ${targetEmail} → ${targetRole}\n`);

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`  Signed in as ${ADMIN_EMAIL}`);

  const snap = await getDocs(
    query(collection(db, "users"), where("email", "==", targetEmail))
  );
  if (snap.empty) {
    throw new Error(`No users doc with email ${targetEmail}`);
  }

  for (const row of snap.docs) {
    await updateDoc(doc(db, "users", row.id), {
      role: targetRole,
      updatedAt: serverTimestamp(),
    });
    console.log(`  Updated users/${row.id} role=${targetRole}`);

    if (targetRole === "admin" || targetRole === "property_manager") {
      await setDoc(
        doc(db, "staff_profiles", row.id),
        {
          userId: row.id,
          displayName: row.data().displayName || "",
          email: targetEmail,
          title: targetRole === "admin" ? "Platform Administrator" : "Property Manager",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`  Upserted staff_profiles/${row.id}`);
    }
  }

  await signOut(auth);
  console.log("\nDone. Sign out of the app and sign in again as that user.\n");
}

main().catch((err) => {
  console.error("\nFailed:", err.code || "", err.message || err);
  process.exit(1);
});
