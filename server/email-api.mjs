/**
 * Standalone Gmail SMTP API — works WITHOUT Firebase Blaze / Cloud Functions.
 *
 * Usage:
 *   node server/email-api.mjs
 *
 * Env (loads functions/.env then .env):
 *   GMAIL_USER
 *   GMAIL_APP_PASSWORD
 *   GMAIL_FROM_NAME=HomeRental
 *   EMAIL_API_PORT=8787
 *   FIREBASE_WEB_API_KEY / FIREBASE_PROJECT_ID (or VITE_FIREBASE_* from root .env)
 *
 * Web app (.env):
 *   VITE_EMAIL_API_URL=http://localhost:8787
 *   VITE_EMAIL_MODE=live
 * Staff must be signed in (Bearer Firebase idToken).
 */

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, "functions", ".env"));
loadEnvFile(resolve(root, ".env"));

const PORT = Number(process.env.EMAIL_API_PORT || 8787);
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const FROM_NAME = process.env.GMAIL_FROM_NAME || "HomeRental";
const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#F3EBE3;font-family:Arial,Helvetica,sans-serif;color:#2C1810;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#2C1810;color:#fff;border-radius:12px;padding:10px 16px;font-weight:bold;">HomeRental</div>
    </div>
    ${bodyHtml}
  </div>
</body></html>`;
}

function renderHtml(template, payload = {}, subject = "") {
  if (template === "renter_credentials_new") {
    return shell({
      title: "Your HomeRental login",
      bodyHtml: `
        <h1 style="font-size:22px;">Your login is ready</h1>
        <p>Hi ${escapeHtml(payload.displayName || "there")},</p>
        <p>Your property manager created a HomeRental account for you:</p>
        <div style="background:#F8F4EF;border-radius:12px;padding:16px;font-family:monospace;font-size:14px;">
          <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
          <p><strong>Temporary password:</strong> ${escapeHtml(payload.temporaryPassword)}</p>
        </div>
        <p>Sign in: <a href="${escapeHtml(payload.loginUrl)}">${escapeHtml(payload.loginUrl)}</a></p>
        <p><strong>On first sign-in you must choose your own password.</strong></p>
      `,
    });
  }
  if (template === "renter_credentials_existing") {
    return shell({
      title: "Your HomeRental login",
      bodyHtml: `
        <h1 style="font-size:22px;">Welcome back</h1>
        <p>Hi ${escapeHtml(payload.displayName || "there")},</p>
        <p>Your room was linked to <strong>${escapeHtml(payload.email)}</strong>.</p>
        <p>Sign in: <a href="${escapeHtml(payload.loginUrl)}">${escapeHtml(payload.loginUrl)}</a></p>
        <p>${escapeHtml(payload.note || "Use Forgot password if needed.")}</p>
      `,
    });
  }
  return shell({
    title: subject || "HomeRental",
    bodyHtml: `<p style="white-space:pre-wrap;">${escapeHtml(payload.message || payload.note || subject)}</p>`,
  });
}

function readJson(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolvePromise(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(data);
}

async function assertStaff(idToken) {
  if (!idToken) throw new Error("Sign in as staff to send email");
  if (!FIREBASE_WEB_API_KEY || !FIREBASE_PROJECT_ID) {
    throw new Error("Set FIREBASE_WEB_API_KEY and FIREBASE_PROJECT_ID (or VITE_FIREBASE_*)");
  }
  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const lookupData = await lookup.json().catch(() => ({}));
  if (!lookup.ok || !lookupData.users?.[0]?.localId) {
    throw new Error("Invalid or expired login");
  }
  const uid = lookupData.users[0].localId;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const profileRes = await fetch(docUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const profileData = await profileRes.json().catch(() => ({}));
  const role = profileData.fields?.role?.stringValue || "";
  if (role !== "admin" && role !== "property_manager") {
    throw new Error("Only staff can send outbound email");
  }
}

if (!GMAIL_USER || !GMAIL_PASS) {
  console.error("Missing GMAIL_USER / GMAIL_APP_PASSWORD (set in functions/.env)");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, from: GMAIL_USER });
    return;
  }

  if (req.method === "POST" && (req.url === "/send" || req.url === "/sendOutboundEmail")) {
    try {
      const idToken = String(req.headers.authorization || "")
        .replace(/^Bearer\s+/i, "")
        .trim();
      await assertStaff(idToken);
      const body = await readJson(req);
      const to = String(body.to || "").trim().toLowerCase();
      const subject = String(body.subject || "").trim();
      const template = String(body.template || "generic");
      const payload = body.payload || {};

      if (!to || !subject) {
        sendJson(res, 400, { error: "to and subject required" });
        return;
      }

      const html = renderHtml(template, payload, subject);
      const info = await transporter.sendMail({
        from: `"${FROM_NAME}" <${GMAIL_USER}>`,
        to,
        subject,
        html,
      });

      console.log(`Sent → ${to} (${info.messageId})`);
      sendJson(res, 200, { ok: true, messageId: info.messageId || null });
    } catch (err) {
      console.error("Send failed:", err.message || err);
      sendJson(res, 500, { error: err.message || "Send failed" });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`\nHomeRental email API listening on http://localhost:${PORT}`);
  console.log(`  From: ${GMAIL_USER}`);
  console.log(`  POST /send  (Authorization: Bearer <staff Firebase idToken>)`);
  console.log(`  GET  /health\n`);
  console.log("Web app .env:");
  console.log(`  VITE_EMAIL_API_URL=http://localhost:${PORT}`);
  console.log(`  VITE_EMAIL_MODE=live\n`);
});
