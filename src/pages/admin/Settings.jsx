import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getHardeningSettings,
  updateHardeningSettings,
  SECURITY_REVIEW_CHECKLIST,
  PRODUCTION_READINESS_CHECKLIST,
} from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Alert,
  Button,
  Spinner,
  Checkbox,
  Textarea,
  Select,
} from "../../components/ui";
import { Link } from "react-router-dom";

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setSettings(await getHardeningSettings());
    } catch (err) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (partial) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = await updateHardeningSettings(partial, user.uid);
      setSettings(next);
      setMessage("Settings saved");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (bucket, key, checked) => {
    const current = settings?.[bucket] || {};
    save({
      [bucket]: {
        ...current,
        [key]: { done: checked, at: checked ? new Date().toISOString() : null },
      },
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & hardening"
        subtitle="Production flags, security review, and readiness — admin only"
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Runtime flags</h2>
        <Checkbox
          label="Maintenance mode (blocks new applications and website chat)"
          checked={Boolean(settings.maintenanceMode)}
          disabled={saving}
          onChange={(e) => save({ maintenanceMode: e.target.checked })}
        />
        <Checkbox
          label="Public applications enabled"
          checked={settings.publicApplyEnabled !== false}
          disabled={saving}
          onChange={(e) => save({ publicApplyEnabled: e.target.checked })}
        />
        <Checkbox
          label="Website chat enabled"
          checked={settings.publicChatEnabled !== false}
          disabled={saving}
          onChange={(e) => save({ publicChatEnabled: e.target.checked })}
        />
        <Select
          label="Email mode"
          value={settings.emailMode || "sandbox"}
          disabled={saving}
          onChange={(e) => save({ emailMode: e.target.value })}
          options={[
            { value: "sandbox", label: "Sandbox (log only — default)" },
            { value: "live", label: "Live Gmail SMTP (Cloud Function)" },
          ]}
          hint="Live: Vercel /api/send with GMAIL_* env; staff must be signed in. Local: npm run email:api."
        />
        <Textarea
          label="Observability notes"
          rows={3}
          value={settings.observabilityNotes || ""}
          onChange={(e) =>
            setSettings((p) => ({ ...p, observabilityNotes: e.target.value }))
          }
          hint="Where you watch Auth spikes, failed deliveries, WhatsApp webhooks…"
        />
        <Button
          size="sm"
          variant="outline"
          loading={saving}
          onClick={() => save({ observabilityNotes: settings.observabilityNotes || "" })}
        >
          Save notes
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Security review</h2>
        <p className="text-sm text-gray-600">
          Walk through before go-live. Details:{" "}
          <code className="text-xs">docs/SECURITY_REVIEW.md</code>
        </p>
        {SECURITY_REVIEW_CHECKLIST.map((item) => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={Boolean(settings.securityChecklist?.[item.key]?.done)}
            disabled={saving}
            onChange={(e) => toggleCheck("securityChecklist", item.key, e.target.checked)}
          />
        ))}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Production readiness</h2>
        <p className="text-sm text-gray-600">
          Backups, deploy, rollback, handover — see{" "}
          <code className="text-xs">docs/PHASE9_HARDENING.md</code>
        </p>
        {PRODUCTION_READINESS_CHECKLIST.map((item) => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={Boolean(settings.productionChecklist?.[item.key]?.done)}
            disabled={saving}
            onChange={(e) => toggleCheck("productionChecklist", item.key, e.target.checked)}
          />
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            loading={saving}
            onClick={() =>
              save({ lastBackupVerifiedAt: new Date().toISOString() })
            }
          >
            Mark backup verified today
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={saving}
            onClick={() => save({ lastRestoreDrillAt: new Date().toISOString() })}
          >
            Mark restore drill today
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Last backup verified: {settings.lastBackupVerifiedAt?.slice(0, 10) || "—"} · Last
          restore drill: {settings.lastRestoreDrillAt?.slice(0, 10) || "—"}
        </p>
      </Card>

      <Card className="space-y-2 text-sm text-gray-600">
        <h2 className="text-lg font-semibold text-gray-900">Quick links</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link className="text-primary" to="/manager/whatsapp">
              WhatsApp sandbox / go-live gate
            </Link>
          </li>
          <li>
            <Link className="text-primary" to="/manager/reports">
              Operational reports
            </Link>
          </li>
          <li>
            <Link className="text-primary" to="/manager/audit">
              Audit log
            </Link>
          </li>
        </ul>
        <Alert variant="info">
          Market: Germany (EUR). One admin desk. Rent MVP: bank transfer + manual
          reconciliation. External messaging stays sandbox until you approve live.
        </Alert>
      </Card>
    </div>
  );
}
