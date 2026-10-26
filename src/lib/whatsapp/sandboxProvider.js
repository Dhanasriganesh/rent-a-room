import { assertPrivateRecipient, WHATSAPP_MODES } from "./adapter";

/**
 * Dry-run provider — never calls Meta. Used until Cloud Functions + secrets exist.
 */
export function createSandboxWhatsAppProvider() {
  return {
    name: "sandbox",
    async send(req) {
      const to = assertPrivateRecipient(req.toE164);
      if (req.type === "template" && !req.templateName) {
        return {
          ok: false,
          mode: WHATSAPP_MODES.SANDBOX,
          status: "failed",
          error: "templateName required for template messages",
        };
      }
      if (req.type === "text" && !String(req.text || "").trim()) {
        return {
          ok: false,
          mode: WHATSAPP_MODES.SANDBOX,
          status: "failed",
          error: "text required",
        };
      }
      return {
        ok: true,
        mode: WHATSAPP_MODES.SANDBOX,
        status: "sandbox_logged",
        providerMessageId: `sandbox_wa_${Date.now()}`,
        meta: {
          to,
          type: req.type,
          templateName: req.templateName || null,
          note: "No Meta API call — sandbox only",
        },
      };
    },
    verifyWebhookSignature() {
      // Sandbox accepts simulated webhooks from the manager UI only
      return true;
    },
  };
}

/**
 * Live/test stub — refuses in the browser. Real sends belong in Cloud Functions.
 */
export function createBrowserBlockedLiveProvider(mode = WHATSAPP_MODES.LIVE) {
  return {
    name: mode,
    async send() {
      return {
        ok: false,
        mode,
        status: "blocked",
        error:
          "Live/test WhatsApp sends cannot use client-side tokens. Deploy Cloud Functions and set secrets first.",
      };
    },
  };
}
