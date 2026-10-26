/**
 * HomeRental Cloud Functions
 * - sendOutboundEmail: staff-only callable; Gmail SMTP via nodemailer
 *
 * Secrets (never put these in VITE_*):
 *   GMAIL_USER
 *   GMAIL_APP_PASSWORD
 *   GMAIL_FROM_NAME (optional)
 *
 * Deploy:
 *   cd functions && npm install
 *   firebase functions:secrets:set GMAIL_APP_PASSWORD
 *   firebase functions:secrets:set GMAIL_USER
 *   firebase deploy --only functions
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { renderEmailHtml } = require("./emailTemplates");

// Optional local emulator support: functions/.env (gitignored)
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require("dotenv").config();
} catch {
  /* dotenv optional */
}

initializeApp();
const db = getFirestore();

const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

async function assertStaff(uid) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User profile not found");
  }
  const role = snap.data().role;
  if (role !== "admin" && role !== "property_manager") {
    throw new HttpsError("permission-denied", "Staff only");
  }
  return snap.data();
}

function createTransporter(user, pass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass: String(pass || "").replace(/\s+/g, ""),
    },
  });
}

/**
 * Callable: send outbound email (renter credentials, etc.)
 * data: { to, subject, template, payload }
 */
exports.sendOutboundEmail = onCall(
  {
    secrets: [gmailUser, gmailAppPassword],
    region: "us-central1",
    timeoutSeconds: 60,
  },
  async (request) => {
    await assertStaff(request.auth?.uid);

    const to = String(request.data?.to || "")
      .trim()
      .toLowerCase();
    const subject = String(request.data?.subject || "").trim();
    const template = String(request.data?.template || "generic");
    const payload = request.data?.payload || {};

    if (!to || !subject) {
      throw new HttpsError("invalid-argument", "to and subject are required");
    }

    const user = gmailUser.value() || process.env.GMAIL_USER;
    const pass = gmailAppPassword.value() || process.env.GMAIL_APP_PASSWORD;
    const fromName = process.env.GMAIL_FROM_NAME || "HomeRental";

    if (!user || !pass) {
      throw new HttpsError(
        "failed-precondition",
        "Gmail SMTP is not configured (GMAIL_USER / GMAIL_APP_PASSWORD secrets)"
      );
    }

    const html = renderEmailHtml(template, payload, subject);
    const transporter = createTransporter(user, pass);

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${user}>`,
        to,
        subject,
        html,
      });

      return {
        ok: true,
        messageId: info.messageId || null,
        accepted: info.accepted || [],
      };
    } catch (err) {
      console.error("sendOutboundEmail failed", err);
      throw new HttpsError(
        "internal",
        err.message || "Failed to send email via Gmail SMTP"
      );
    }
  }
);
