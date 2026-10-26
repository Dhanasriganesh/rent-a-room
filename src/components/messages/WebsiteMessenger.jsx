import { useEffect, useState } from "react";
import { startWebsiteEnquiry } from "../../lib/firestore";
import { assertClientRateLimit, RATE_LIMITS } from "../../lib/rateLimit";
import { Button, Input, Select, Textarea, Alert } from "../ui";
import { FiMessageCircle, FiX, FiSend } from "react-icons/fi";

const STORAGE_KEY = "rr_website_chat";

const TOPICS = [
  { value: "availability", label: "Room availability" },
  { value: "viewing", label: "Book a viewing" },
  { value: "application", label: "Application status" },
  { value: "general", label: "Contact a manager" },
];

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function saveSession(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function WebsiteMessenger() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(() => loadSession());
  const [form, setForm] = useState({
    guestName: loadSession().guestName || "",
    guestEmail: loadSession().guestEmail || "",
    guestPhone: "",
    topic: "general",
    body: "",
  });

  useEffect(() => {
    setSession(loadSession());
  }, [open]);

  const transcript = session.transcript || [];

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      assertClientRateLimit("website_chat", {
        ...RATE_LIMITS.website_chat,
        identity: form.guestEmail || "anon",
      });
      const conversationId = await startWebsiteEnquiry({
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        guestPhone: form.guestPhone,
        body: form.body,
        topic: form.topic,
        existingConversationId: session.conversationId || null,
      });
      const next = {
        conversationId,
        guestName: form.guestName,
        guestEmail: form.guestEmail,
        transcript: [
          ...transcript,
          { role: "guest", body: form.body, at: new Date().toISOString() },
          {
            role: "system",
            body: "Thanks — a manager will reply here when available. We do not confirm availability until it is checked in our records.",
            at: new Date().toISOString(),
          },
        ],
      };
      saveSession(next);
      setSession(next);
      setForm((p) => ({ ...p, body: "" }));
    } catch (err) {
      setError(err.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[min(32rem,min(70vh,calc(100dvh-6rem)))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Chat with us</p>
              <p className="text-xs text-white/80">Website · human handover</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="touch-target flex items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="Close chat"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
            {transcript.length === 0 && (
              <p className="text-sm text-gray-500">
                Ask about rooms, viewings, or applications. A manager will pick this up — we will not
                invent availability.
              </p>
            )}
            {transcript.map((m, i) => (
              <div
                key={`${m.at}-${i}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "guest"
                    ? "ml-6 bg-primary text-white"
                    : "mr-6 bg-white text-gray-700 ring-1 ring-gray-100"
                }`}
              >
                {m.body}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="space-y-2 border-t border-gray-100 p-3">
            {error && <Alert variant="error">{error}</Alert>}
            {!session.conversationId && (
              <>
                <Input
                  placeholder="Your name"
                  required
                  value={form.guestName}
                  onChange={(e) => setForm((p) => ({ ...p, guestName: e.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  required
                  value={form.guestEmail}
                  onChange={(e) => setForm((p) => ({ ...p, guestEmail: e.target.value }))}
                />
                <Select
                  value={form.topic}
                  onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                  options={TOPICS}
                />
              </>
            )}
            <Textarea
              rows={2}
              required
              placeholder="Type your message…"
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            />
            <Button type="submit" className="w-full gap-2" loading={sending}>
              <FiSend /> Send
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:opacity-95"
        aria-label="Open chat"
      >
        {open ? <FiX className="h-6 w-6" /> : <FiMessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
