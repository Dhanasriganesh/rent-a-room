/**
 * Create a property_manager account for the operations desk.
 *
 * Defaults:
 *   MANAGER_EMAIL=manager@gmail.com
 *   MANAGER_PASSWORD=Manager@123
 *
 * Uses SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD to set the role (admin can update roles).
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
const EMAIL = (env.MANAGER_EMAIL || "manager@gmail.com").trim().toLowerCase();
const PASSWORD = env.MANAGER_PASSWORD || "Manager@123";
const DISPLAY = env.MANAGER_NAME || "Property Manager";
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
  console.log(`\nSeeding property manager: ${EMAIL}\n`);

  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: DISPLAY }).catch(() => {});
    console.log("  Auth user created");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
      uid = cred.user.uid;
      console.log("  Auth user already exists");
    } else {
      throw err;
    }
  }

  const ref = doc(db, "users", uid);
  if (!(await getDoc(ref)).exists()) {
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
    console.log("  Profile created (temp renter)");
  }

  await signOut(auth);

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("  Signed in as superadmin to set role");

  await updateDoc(ref, {
    role: "property_manager",
    accountStatus: "active",
    displayName: DISPLAY,
    email: EMAIL,
    updatedAt: serverTimestamp(),
  });
  console.log("  Role set to property_manager");

  await setDoc(
    doc(db, "staff_profiles", uid),
    {
      userId: uid,
      displayName: DISPLAY,
      email: EMAIL,
      title: "Property Manager",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  await signOut(auth);
  console.log(`\nDone. Sign in at: /login`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: (seed default or MANAGER_PASSWORD)\n`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.code || "", err.message || err);
  process.exit(1);
});
