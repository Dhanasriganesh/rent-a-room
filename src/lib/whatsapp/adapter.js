/**
 * WhatsApp Business provider adapter (Phase 7).
 * App code talks only to this interface — never to Meta APIs directly.
 *
 * Live Cloud API tokens MUST stay server-side (Cloud Functions / secrets).
 * The browser only runs sandbox / dry-run and settings that do not hold secrets.
 */

export const WHATSAPP_MODES = {
  SANDBOX: "sandbox",
  TEST: "test", // Meta test number via Functions (when configured)
  LIVE: "live", // Blocked until platform_settings.whatsapp.productionApproved
};

/**
 * @typedef {object} WhatsAppSendRequest
 * @property {string} toE164 - Digits with country code, no +
 * @property {'text'|'template'} type
 * @property {string} [text]
 * @property {string} [templateName]
 * @property {string} [templateLanguage]
 * @property {object} [templateComponents]
 * @property {string} [idempotencyKey]
 * @property {string} [conversationId]
 */

/**
 * @typedef {object} WhatsAppSendResult
 * @property {boolean} ok
 * @property {string} mode
 * @property {string} [providerMessageId]
 * @property {string} status - queued|sandbox_logged|sent|failed|blocked
 * @property {string} [error]
 * @property {object} [meta]
 */

/**
 * @typedef {object} WhatsAppProvider
 * @property {string} name
 * @property {(req: WhatsAppSendRequest) => Promise<WhatsAppSendResult>} send
 * @property {(rawBody: string, signatureHeader: string|null, appSecret: string) => boolean} [verifyWebhookSignature]
 */

export function normalizeE164(input) {
  return String(input || "").replace(/\D/g, "");
}

/** Groups are unsupported on standard Cloud API unless Meta explicitly enables them. */
export function assertPrivateRecipient(toE164) {
  const n = normalizeE164(toE164);
  if (!n || n.length < 8) {
    throw new Error("WhatsApp recipient must be a private E.164 phone number");
  }
  if (n.startsWith("group:") || n.includes("@g.us")) {
    throw new Error("WhatsApp group posting is not supported");
  }
  return n;
}
