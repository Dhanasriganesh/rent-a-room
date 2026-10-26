import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  createWhatsAppTemplate,
  getWhatsAppTemplates,
  sendWhatsAppMessage,
  ingestWhatsAppWebhook,
  getWhatsAppWebhookEvents,
  WHATSAPP_PRODUCTION_CHECKLIST,
  getDeliveryLogs,
} from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  Spinner,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Tabs,
  Checkbox,
} from "../../components/ui";
import { FiSend, FiRadio } from "react-icons/fi";

const SAMPLE_INBOUND_WEBHOOK = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "15550001111", phone_number_id: "PHONE_NUMBER_ID" },
            contacts: [{ profile: { name: "Test Tenant" }, wa_id: "15551234567" }],
            messages: [
              {
                from: "15551234567",
                id: "wamid.TEST_INBOUND",
                timestamp: String(Math.floor(Date.now() / 1000)),
                text: { body: "Hello — testing WhatsApp webhook (sandbox)" },
                type: "text",
              },
            ],
          },
        },
      ],
    },
  ],
};

const SAMPLE_STATUS_WEBHOOK = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            statuses: [
              {
                id: "wamid.TEST_OUTBOUND",
                status: "delivered",
                timestamp: String(Math.floor(Date.now() / 1000)),
                recipient_id: "15551234567",
              },
            ],
          },
        },
      ],
    },
  ],
};

export default function ManagerWhatsApp() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [waLogs, setWaLogs] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [sendForm, setSendForm] = useState({
    toE164: "15551234567",
    type: "text",
    text: "Sandbox test message — not sent to Meta",
    templateName: "rent_reminder",
  });

  const [tplForm, setTplForm] = useState({
    name: "rent_reminder",
    language: "en",
    category: "utility",
    body: "Hello {{1}}, your rent for {{2}} is due on {{3}}.",
    metaStatus: "draft_local",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, t, e, logs] = await Promise.all([
        getWhatsAppSettings(),
        getWhatsAppTemplates(),
        getWhatsAppWebhookEvents(20),
        getDeliveryLogs(40),
      ]);
      setSettings(s);
      setTemplates(t);
      setEvents(e);
      setWaLogs(logs.filter((l) => l.channel === "whatsapp"));
    } catch (err) {
      setError(err.message || "Failed to load WhatsApp settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (partial) => {
    setBusy(true);
    setError("");
    try {
      const next = await updateWhatsAppSettings(partial, user.uid);
      setSettings(next);
      setMessage("Settings saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleChecklist = async (key) => {
    const checklist = { ...(settings?.checklist || {}) };
    checklist[key] = !checklist[key];
    await saveSettings({ checklist });
  };

  const sendTest = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await sendWhatsAppMessage(
        {
          toE164: sendForm.toE164,
          type: sendForm.type,
          text: sendForm.type === "text" ? sendForm.text : undefined,
          templateName: sendForm.type === "template" ? sendForm.templateName : undefined,
          templateLanguage: "en",
          idempotencyKey: `wa-test:${sendForm.toE164}:${Date.now()}`,
        },
        user.uid
      );
      setMessage(
        result.ok
          ? `Sandbox send logged (${result.providerMessageId}) — no Meta API call`
          : result.error || "Send failed"
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createWhatsAppTemplate(tplForm, user.uid);
      setMessage("Local template saved (approve in Meta before live use)");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ingest = async (payload, label) => {
    setBusy(true);
    setError("");
    try {
      const result = await ingestWhatsAppWebhook(payload, {
        actorUserId: user.uid,
        simulated: true,
      });
      setMessage(
        `${label}: event ${result.eventId.slice(0, 8)}… · inbound ${result.inbound.length} · statuses ${result.statuses}`
      );
      await load();
      setTab("webhooks");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const checklistDone = WHATSAPP_PRODUCTION_CHECKLIST.filter(
    (i) => settings.checklist?.[i.key]
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        subtitle="Cloud API adapter · sandbox first · no live number without approval"
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <Alert variant="warning">
        Access tokens must never sit in the Vite client. Live/test Meta calls go through Cloud
        Functions + Secret Manager. This UI uses the <strong>sandbox adapter</strong> only.
        Migrating the client&apos;s existing number requires the coexistence checklist and written
        approval.
      </Alert>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "send", label: "Test send" },
          { id: "templates", label: `Templates (${templates.length})` },
          { id: "webhooks", label: `Webhooks (${events.length})` },
          { id: "checklist", label: `Go-live (${checklistDone}/${WHATSAPP_PRODUCTION_CHECKLIST.length})` },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div className="space-y-4">
          <Card className="!p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">mode: {settings.mode || "sandbox"}</Badge>
              <Badge variant={settings.productionApproved ? "danger" : "success"}>
                productionApproved: {String(!!settings.productionApproved)}
              </Badge>
            </div>
            <Select
              label="Operating mode"
              value={settings.mode || "sandbox"}
              onChange={(e) => saveSettings({ mode: e.target.value })}
              options={[
                { value: "sandbox", label: "Sandbox (default)" },
                { value: "test", label: "Test number (Functions required)" },
                { value: "live", label: "Live (blocked without approval)" },
              ]}
            />
            <Textarea
              label="Internal notes"
              rows={2}
              value={settings.notes || ""}
              onChange={(e) => setSettings((p) => ({ ...p, notes: e.target.value }))}
            />
            <Button
              variant="outline"
              loading={busy}
              onClick={() => saveSettings({ notes: settings.notes })}
            >
              Save notes
            </Button>
          </Card>
          <Card className="!p-4">
            <h3 className="font-semibold text-gray-900">Recent WhatsApp delivery logs</h3>
            {waLogs.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No WhatsApp sends logged yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {waLogs.slice(0, 8).map((l) => (
                  <li key={l.id}>
                    {l.status} · {l.to} · {l.subject}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "send" && (
        <Card className="!p-4">
          <form onSubmit={sendTest} className="space-y-4">
            <Input
              label="Recipient E.164 (digits, country code)"
              required
              value={sendForm.toE164}
              onChange={(e) => setSendForm((p) => ({ ...p, toE164: e.target.value }))}
              hint="Private tenant number only — groups unsupported"
            />
            <Select
              label="Type"
              value={sendForm.type}
              onChange={(e) => setSendForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { value: "text", label: "Text (inside customer-care window)" },
                { value: "template", label: "Approved utility template" },
              ]}
            />
            {sendForm.type === "text" ? (
              <Textarea
                label="Text"
                rows={3}
                value={sendForm.text}
                onChange={(e) => setSendForm((p) => ({ ...p, text: e.target.value }))}
              />
            ) : (
              <Input
                label="Template name"
                value={sendForm.templateName}
                onChange={(e) => setSendForm((p) => ({ ...p, templateName: e.target.value }))}
              />
            )}
            <Button type="submit" loading={busy} className="gap-2">
              <FiSend /> Sandbox send
            </Button>
          </form>
        </Card>
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <Card className="!p-4">
            <form onSubmit={saveTemplate} className="space-y-3">
              <Input
                label="Name"
                required
                value={tplForm.name}
                onChange={(e) => setTplForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Textarea
                label="Body"
                rows={3}
                required
                value={tplForm.body}
                onChange={(e) => setTplForm((p) => ({ ...p, body: e.target.value }))}
              />
              <Button type="submit" loading={busy}>
                Save local template
              </Button>
            </form>
          </Card>
          {templates.length === 0 ? (
            <EmptyState icon={FiRadio} title="No templates" description="Add utility templates locally, then submit in Meta." />
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="!p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium">{t.name}</span>
                  <Badge>{t.metaStatus}</Badge>
                  <Badge variant="default">{t.language}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">{t.body}</p>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-4">
          <Card className="!p-4 space-y-3">
            <p className="text-sm text-gray-600">
              Simulate Meta webhook payloads (same shape the Cloud Function will forward). Creates
              inbox threads on channel <code>whatsapp</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button loading={busy} onClick={() => ingest(SAMPLE_INBOUND_WEBHOOK, "Inbound message")}>
                Ingest test inbound
              </Button>
              <Button
                variant="outline"
                loading={busy}
                onClick={() => ingest(SAMPLE_STATUS_WEBHOOK, "Status update")}
              >
                Ingest delivered status
              </Button>
            </div>
          </Card>
          {events.map((ev) => (
            <Card key={ev.id} className="!p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={ev.simulated ? "warning" : "info"}>
                  {ev.simulated ? "simulated" : "live"}
                </Badge>
                <Badge variant="success">{ev.processed ? "processed" : "pending"}</Badge>
              </div>
              <p className="mt-1 text-gray-600">
                inbound {ev.inboundCount ?? "—"} · statuses {ev.statusCount ?? "—"} ·{" "}
                {ev.rawSummary?.field || ev.payloadType}
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === "checklist" && (
        <Card className="!p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Complete every item before enabling production. Live mode still requires{" "}
            <code>productionApproved</code>.
          </p>
          <div className="space-y-2">
            {WHATSAPP_PRODUCTION_CHECKLIST.map((item) => (
              <Checkbox
                key={item.key}
                label={item.label}
                checked={Boolean(settings.checklist?.[item.key])}
                onChange={() => toggleChecklist(item.key)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              loading={busy}
              disabled={checklistDone < WHATSAPP_PRODUCTION_CHECKLIST.length}
              onClick={() =>
                saveSettings({
                  productionApproved: true,
                  coexistenceReviewed: true,
                  mode: "sandbox",
                })
              }
            >
              Record written approval (keep sandbox until Functions live)
            </Button>
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => saveSettings({ productionApproved: false, mode: "sandbox" })}
            >
              Revoke approval
            </Button>
          </div>
          {settings.productionApproved && (
            <Alert variant="warning">
              Approval recorded. Deploy Cloud Functions and secrets before switching mode to live.
              Do not migrate the client number until coexistence is signed off.
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}
