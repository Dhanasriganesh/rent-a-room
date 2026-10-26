/**
 * HTML templates for outbound mail (HomeRental).
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background:#F3EBE3;font-family:Arial,Helvetica,sans-serif;color:#2C1810;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(44,24,16,0.08);">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#2C1810;color:#fff;border-radius:12px;padding:10px 16px;font-weight:bold;letter-spacing:0.02em;">HomeRental</div>
    </div>
    ${bodyHtml}
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:13px;color:#666;">
      Room mediation · This message was sent by your property manager.
    </div>
  </div>
</body>
</html>`;
}

function renterCredentialsNew(payload = {}) {
  const name = escapeHtml(payload.displayName || "there");
  const email = escapeHtml(payload.email || "");
  const password = escapeHtml(payload.temporaryPassword || "");
  const loginUrl = escapeHtml(payload.loginUrl || "");

  return shell({
    title: "Your HomeRental login",
    bodyHtml: `
      <h1 style="font-size:22px;margin:0 0 12px;">Your login is ready</h1>
      <p style="line-height:1.6;">Hi ${name},</p>
      <p style="line-height:1.6;">Your property manager created a HomeRental account for you. Use these details to sign in:</p>
      <div style="background:#F8F4EF;border-radius:12px;padding:16px;margin:18px 0;font-family:Consolas,monospace;font-size:14px;">
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
        <p style="margin:0;"><strong>Temporary password:</strong> ${password}</p>
      </div>
      <p style="line-height:1.6;">Sign in here: <a href="${loginUrl}" style="color:#FF8C00;">${loginUrl}</a></p>
      <p style="line-height:1.6;"><strong>Important:</strong> on first sign-in you will be asked to choose your own password. Do not share this temporary password.</p>
      <p style="line-height:1.6;">Warm regards,<br/>HomeRental desk</p>
    `,
  });
}

function renterCredentialsExisting(payload = {}) {
  const name = escapeHtml(payload.displayName || "there");
  const email = escapeHtml(payload.email || "");
  const loginUrl = escapeHtml(payload.loginUrl || "");
  const note = escapeHtml(
    payload.note ||
      "Use Forgot password on the login page if you need a new password."
  );

  return shell({
    title: "Your HomeRental login",
    bodyHtml: `
      <h1 style="font-size:22px;margin:0 0 12px;">Welcome back</h1>
      <p style="line-height:1.6;">Hi ${name},</p>
      <p style="line-height:1.6;">Your property manager linked your room to the HomeRental account for <strong>${email}</strong>.</p>
      <p style="line-height:1.6;">Sign in: <a href="${loginUrl}" style="color:#FF8C00;">${loginUrl}</a></p>
      <p style="line-height:1.6;">${note}</p>
      <p style="line-height:1.6;">Warm regards,<br/>HomeRental desk</p>
    `,
  });
}

function genericHtml(payload = {}, subject = "") {
  const text = escapeHtml(payload.message || payload.note || subject || "Update from HomeRental");
  return shell({
    title: subject || "HomeRental",
    bodyHtml: `<p style="line-height:1.6;white-space:pre-wrap;">${text}</p>`,
  });
}

function renderEmailHtml(template, payload, subject) {
  switch (template) {
    case "renter_credentials_new":
      return renterCredentialsNew(payload);
    case "renter_credentials_existing":
      return renterCredentialsExisting(payload);
    default:
      return genericHtml(payload, subject);
  }
}

module.exports = { renderEmailHtml, escapeHtml };
