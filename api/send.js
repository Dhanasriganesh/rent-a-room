/**
 * Vercel Serverless Function — Gmail SMTP (nodemailer).
 *
 * Vercel env (server-only — NO VITE_ prefix):
 *   GMAIL_USER
 *   GMAIL_APP_PASSWORD
 *   GMAIL_FROM_NAME=HomeRental
 *   FIREBASE_WEB_API_KEY   (same value as VITE_FIREBASE_API_KEY — used to verify staff login)
 *   FIREBASE_PROJECT_ID    (same as VITE_FIREBASE_PROJECT_ID)
 *
 * Client:
 *   VITE_EMAIL_MODE=live
 *   (no EMAIL_API_KEY needed — manager must be signed in; we verify their Firebase token)
 */

import nodemailer from "nodemailer";

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

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
}

async function assertStaffFromIdToken(idToken) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";

  if (!apiKey || !projectId) {
    throw new Error(
      "Set FIREBASE_WEB_API_KEY and FIREBASE_PROJECT_ID on Vercel (same values as your VITE_FIREBASE_* vars)"
    );
  }

  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const lookupData = await lookup.json().catch(() => ({}));
  if (!lookup.ok || !lookupData.users?.[0]?.localId) {
    throw new Error("Invalid or expired login — sign in again");
  }

  const uid = lookupData.users[0].localId;
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const profileRes = await fetch(docUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const profileData = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    throw new Error("Could not read user profile for email send");
  }

  const role = profileData.fields?.role?.stringValue || "";
  if (role !== "admin" && role !== "property_manager") {
    throw new Error("Only staff can send outbound email");
  }

  return { uid, role };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) {
    return res.status(401).json({ error: "Sign in as staff to send email" });
  }

  try {
    await assertStaffFromIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }

  const gmailUser = process.env.GMAIL_USER || "";
  const gmailPass = String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  const fromName = process.env.GMAIL_FROM_NAME || "HomeRental";

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({
      error: "Gmail not configured (set GMAIL_USER and GMAIL_APP_PASSWORD on Vercel)",
    });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const to = String(body.to || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const template = String(body.template || "generic");
  const payload = body.payload || {};

  if (!to || !subject) {
    return res.status(400).json({ error: "to and subject required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to,
      subject,
      html: renderHtml(template, payload, subject),
    });

    return res.status(200).json({
      ok: true,
      messageId: info.messageId || null,
    });
  } catch (err) {
    console.error("Vercel email send failed:", err);
    return res.status(500).json({ error: err.message || "Send failed" });
  }
}
