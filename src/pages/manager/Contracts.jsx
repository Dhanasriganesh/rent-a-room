import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getActiveContractTemplates,
  getAllContractTemplates,
  createContractTemplate,
  createContractTemplateVersion,
  getAllContracts,
  getAllAllocations,
  getAllOwners,
  getAllProperties,
  previewContractDraft,
  generateContractDraft,
  approveContract,
  issueContract,
  voidContract,
  getAllRenewalRequests,
  updateRenewalRequestStatus,
  generateRenewalDraft,
} from "../../lib/firestore";
import {
  CONTRACT_STATUSES,
  CONTRACT_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE_BODY,
  RENEWAL_REQUEST_STATUSES,
} from "../../lib/constants";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Tabs,
} from "../../components/ui";
import { FiFileText, FiPlus } from "react-icons/fi";

const statusLabel = (list, v) => list.find((s) => s.value === v)?.label || v;

export default function ManagerContracts() {
  const { user } = useAuth();
  const [tab, setTab] = useState("contracts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [templates, setTemplates] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [renewals, setRenewals] = useState([]);

  const [templateModal, setTemplateModal] = useState(false);
  const [versionOf, setVersionOf] = useState(null);
  const [genModal, setGenModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [viewContract, setViewContract] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tplForm, setTplForm] = useState({
    name: "Standard rental agreement",
    ownerRecordId: "",
    propertyId: "",
    body: DEFAULT_CONTRACT_TEMPLATE_BODY,
    notes: "",
  });

  const [genForm, setGenForm] = useState({
    allocationId: "",
    templateId: "",
    contract_end_date: "",
    tenant_full_name: "",
    owner_legal_name: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [tpls, allTpl, cons, allocs, own, props, rens] = await Promise.all([
        getActiveContractTemplates(),
        getAllContractTemplates(),
        getAllContracts(),
        getAllAllocations(),
        getAllOwners(),
        getAllProperties(),
        getAllRenewalRequests(),
      ]);
      setTemplates(allTpl);
      setContracts(cons);
      setAllocations(allocs.filter((a) => ["reserved", "active"].includes(a.status)));
      setOwners(own);
      setProperties(props);
      setRenewals(rens);
      if (!genForm.templateId && tpls[0]) {
        setGenForm((p) => ({ ...p, templateId: tpls[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.status === "active"),
    [templates]
  );

  const openNewTemplate = () => {
    setVersionOf(null);
    setTplForm({
      name: "Standard rental agreement",
      ownerRecordId: "",
      propertyId: "",
      body: DEFAULT_CONTRACT_TEMPLATE_BODY,
      notes: "",
    });
    setTemplateModal(true);
  };

  const openVersion = (tpl) => {
    setVersionOf(tpl);
    setTplForm({
      name: tpl.name,
      ownerRecordId: tpl.ownerRecordId || "",
      propertyId: tpl.propertyId || "",
      body: tpl.body || DEFAULT_CONTRACT_TEMPLATE_BODY,
      notes: tpl.notes || "",
    });
    setTemplateModal(true);
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (versionOf) {
        await createContractTemplateVersion(versionOf.id, tplForm, user.uid);
        setMessage("New template version created (previous superseded)");
      } else {
        await createContractTemplate(tplForm, user.uid);
        setMessage("Template created");
      }
      setTemplateModal(false);
      await load();
    } catch (err) {
      setError(err.message || "Template save failed");
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    setSaving(true);
    setError("");
    setPreview(null);
    try {
      const result = await previewContractDraft({
        allocationId: genForm.allocationId,
        templateId: genForm.templateId,
        fieldOverrides: {
          contract_end_date: genForm.contract_end_date || undefined,
          tenant_full_name: genForm.tenant_full_name || undefined,
          owner_legal_name: genForm.owner_legal_name || undefined,
        },
      });
      setPreview(result);
      if (!result.ok) {
        setError(`Missing required: ${result.missing.join(", ")}`);
      }
    } catch (err) {
      setError(err.message || "Preview failed");
    } finally {
      setSaving(false);
    }
  };

  const runGenerate = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await generateContractDraft(
        {
          allocationId: genForm.allocationId,
          templateId: genForm.templateId,
          fieldOverrides: {
            contract_end_date: genForm.contract_end_date || undefined,
            tenant_full_name: genForm.tenant_full_name || undefined,
            owner_legal_name: genForm.owner_legal_name || undefined,
          },
        },
        user.uid
      );
      setGenModal(false);
      setPreview(null);
      setMessage(`Draft ${result.contractReference} created`);
      await load();
      setTab("contracts");
    } catch (err) {
      setError(
        err.missing?.length
          ? `Blocked — missing: ${err.missing.join(", ")}`
          : err.message || "Generation failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const onApprove = async (id) => {
    try {
      await approveContract(id, user.uid);
      setMessage("Contract approved");
      setViewContract(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onIssue = async (id) => {
    try {
      await issueContract(id, user.uid);
      setMessage("Contract issued to tenant");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onVoid = async (id) => {
    const reason = prompt("Reason for voiding (kept on record):");
    if (reason === null) return;
    try {
      await voidContract(id, reason, user.uid);
      setMessage("Contract voided — history preserved");
      setViewContract(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const fulfillRenewal = async (req) => {
    if (!activeTemplates[0]) {
      setError("Create an active template first");
      return;
    }
    const allocationId = req.allocationId || contracts.find((c) => c.id === req.contractId)?.allocationId;
    if (!allocationId || !req.contractId) {
      setError("Renewal needs a prior contract and allocation");
      return;
    }
    setSaving(true);
    try {
      await updateRenewalRequestStatus(req.id, "under_review", "", user.uid);
      const result = await generateRenewalDraft(
        {
          priorContractId: req.contractId,
          templateId: activeTemplates[0].id,
          allocationId,
          fieldOverrides: {
            contract_start_date: req.requestedStartDate || undefined,
            contract_end_date: req.requestedEndDate || undefined,
          },
          renewalRequestId: req.id,
        },
        user.uid
      );
      setMessage(`Renewal draft ${result.contractReference} created (prior contract kept)`);
      setTab("contracts");
      await load();
    } catch (err) {
      setError(err.message || "Renewal draft failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts & documents"
        subtitle="Templates, drafts, approval — not automatic legal signing"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openNewTemplate}>
              New template
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setPreview(null);
                setGenModal(true);
              }}
              disabled={!activeTemplates.length || !allocations.length}
            >
              <FiPlus /> Generate draft
            </Button>
          </div>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !templateModal && !genModal && <Alert variant="error">{error}</Alert>}

      <Alert variant="info">
        Drafts use named placeholders (e.g. {"{{tenant_full_name}}"}). Missing required fields
        block generation. Approved contracts are stored privately in Firestore — not public URLs.
        A generated PDF is never treated as signed.
      </Alert>

      <Tabs
        tabs={[
          { id: "contracts", label: `Contracts (${contracts.length})` },
          { id: "templates", label: `Templates (${templates.length})` },
          { id: "renewals", label: `Renewals (${renewals.length})` },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "contracts" && (
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiFileText}
                title="No contracts yet"
                description="Allocate a bed, then generate a draft from a template."
              />
            </Card>
          ) : (
            contracts.map((c) => (
              <Card key={c.id} className="!p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{c.contractReference}</h3>
                      <Badge>{statusLabel(CONTRACT_STATUSES, c.status)}</Badge>
                      <Badge variant="default">v{c.version}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {c.applicantName || "Tenant"} · €{Number(c.monthlyRent).toLocaleString()}/mo
                      {c.startDate ? ` · from ${c.startDate}` : ""}
                      {c.endDate ? ` · ends ${c.endDate}` : " · no end date"}
                      {c.supersedesContractId ? " · renewal" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewContract(c)}>
                      Preview
                    </Button>
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => onApprove(c.id)}>
                        Approve
                      </Button>
                    )}
                    {c.status === "approved" && (
                      <Button size="sm" onClick={() => onIssue(c.id)}>
                        Issue to tenant
                      </Button>
                    )}
                    {["draft", "approved", "issued"].includes(c.status) && (
                      <Button size="sm" variant="ghost" onClick={() => onVoid(c.id)}>
                        Void
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Placeholders:{" "}
            {CONTRACT_PLACEHOLDERS.map((p) => `{{${p.key}}}`).join(", ")}
          </p>
          {templates.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiFileText}
                title="No templates"
                description="Create a template with named placeholders."
                action={<Button onClick={openNewTemplate}>New template</Button>}
              />
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="!p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <Badge variant={t.status === "active" ? "success" : "default"}>
                        {t.status} · v{t.version}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {(t.placeholders || []).join(", ") || "No placeholders detected"}
                    </p>
                  </div>
                  {t.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => openVersion(t)}>
                      New version
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "renewals" && (
        <div className="space-y-3">
          {renewals.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiFileText}
                title="No renewal requests"
                description="Tenants can request renewal from their documents page."
              />
            </Card>
          ) : (
            renewals.map((r) => (
              <Card key={r.id} className="!p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Badge>{statusLabel(RENEWAL_REQUEST_STATUSES, r.status)}</Badge>
                    <p className="mt-2 text-sm text-gray-700">{r.message || "No message"}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {r.requestedStartDate || "?"} → {r.requestedEndDate || "?"}
                    </p>
                  </div>
                  {["submitted", "under_review", "approved"].includes(r.status) && (
                    <Button size="sm" loading={saving} onClick={() => fulfillRenewal(r)}>
                      Generate renewal draft
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={templateModal}
        onClose={() => setTemplateModal(false)}
        title={versionOf ? "New template version" : "New template"}
        size="lg"
      >
        <form onSubmit={saveTemplate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Name"
            required
            value={tplForm.name}
            onChange={(e) => setTplForm((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Owner (optional)"
              value={tplForm.ownerRecordId}
              onChange={(e) => setTplForm((p) => ({ ...p, ownerRecordId: e.target.value }))}
              options={owners.map((o) => ({ value: o.id, label: o.fullName }))}
              placeholder="Any owner"
            />
            <Select
              label="Property (optional)"
              value={tplForm.propertyId}
              onChange={(e) => setTplForm((p) => ({ ...p, propertyId: e.target.value }))}
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Any property"
            />
          </div>
          <Textarea
            label="Template body"
            rows={14}
            required
            value={tplForm.body}
            onChange={(e) => setTplForm((p) => ({ ...p, body: e.target.value }))}
            hint="Use {{placeholder}} tokens. Original versions are kept when you create a new version."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTemplateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={genModal}
        onClose={() => setGenModal(false)}
        title="Generate contract draft"
        size="lg"
      >
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Select
            label="Allocation"
            required
            value={genForm.allocationId}
            onChange={(e) => setGenForm((p) => ({ ...p, allocationId: e.target.value }))}
            options={allocations.map((a) => ({
              value: a.id,
              label: `${a.applicantName || a.id.slice(0, 8)} · from ${a.startDate || "?"}`,
            }))}
            placeholder="Select allocation"
          />
          <Select
            label="Template"
            required
            value={genForm.templateId}
            onChange={(e) => setGenForm((p) => ({ ...p, templateId: e.target.value }))}
            options={activeTemplates.map((t) => ({
              value: t.id,
              label: `${t.name} v${t.version}`,
            }))}
            placeholder="Select template"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Override tenant name (if empty on allocation)"
              value={genForm.tenant_full_name}
              onChange={(e) => setGenForm((p) => ({ ...p, tenant_full_name: e.target.value }))}
            />
            <Input
              label="Override owner legal name"
              value={genForm.owner_legal_name}
              onChange={(e) => setGenForm((p) => ({ ...p, owner_legal_name: e.target.value }))}
            />
            <Input
              label="End date override"
              type="date"
              value={genForm.contract_end_date}
              onChange={(e) => setGenForm((p) => ({ ...p, contract_end_date: e.target.value }))}
            />
          </div>
          {preview && (
            <Card className="!p-3">
              {preview.ok ? (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-gray-800">
                  {preview.body}
                </pre>
              ) : (
                <Alert variant="warning">
                  Missing: {preview.missing.join(", ")}. Fix allocation/owner data or overrides.
                </Alert>
              )}
            </Card>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setGenModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={saving}
              disabled={!genForm.allocationId || !genForm.templateId}
              onClick={runPreview}
            >
              Preview / validate
            </Button>
            <Button
              type="button"
              loading={saving}
              disabled={!genForm.allocationId || !genForm.templateId || (preview && !preview.ok)}
              onClick={runGenerate}
            >
              Create draft
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewContract}
        onClose={() => setViewContract(null)}
        title={viewContract?.contractReference || "Contract"}
        size="lg"
      >
        {viewContract && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Status: {statusLabel(CONTRACT_STATUSES, viewContract.status)} · v
              {viewContract.version}
            </p>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
              {viewContract.body}
            </pre>
            <Alert variant="warning">
              This is a system draft/record — not a signed legal instrument.
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}
