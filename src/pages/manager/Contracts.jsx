import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
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
  extractPlaceholders,
  renderContractTemplate,
  issueContract,
  voidContract,
  getAllRenewalRequests,
  updateRenewalRequestStatus,
  generateRenewalDraft,
} from "../../lib/firestore";
import {
  CONTRACT_STATUSES,
  CONTRACT_PLACEHOLDERS,
  DOCUMENT_CATEGORIES,
  DEFAULT_CONTRACT_TEMPLATE_BODY,
  RENEWAL_REQUEST_STATUSES,
} from "../../lib/constants";
import { downloadTextPdf } from "../../lib/documentPdf";
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
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import { FiFileText, FiUpload } from "react-icons/fi";

const statusLabel = (list, v) => list.find((s) => s.value === v)?.label || v;
const categoryLabel = (value) =>
  DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || "Other";
const fieldLabel = (key) =>
  CONTRACT_PLACEHOLDERS.find((p) => p.key === key)?.label || key.replace(/_/g, " ");

export default function ManagerContracts() {
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState("rental_agreement");
  const [search, setSearch] = useState("");
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
  const [viewContract, setViewContract] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tplForm, setTplForm] = useState({
    name: "Standard rental agreement",
    category: "rental_agreement",
    ownerRecordId: "",
    propertyId: "",
    body: DEFAULT_CONTRACT_TEMPLATE_BODY,
    notes: "",
  });

  const [genForm, setGenForm] = useState({
    allocationId: "",
    templateId: "",
  });
  const [docFields, setDocFields] = useState({});
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // First paint: only what the form needs. Phones stay blank too long if we wait on every list.
      const [allTpl, allocs] = await Promise.all([
        getAllContractTemplates(),
        getAllAllocations(),
      ]);
      setTemplates(allTpl);
      setAllocations(allocs.filter((a) => ["reserved", "active"].includes(a.status)));
      const firstActive = allTpl.find((t) => t.status === "active");
      if (firstActive) {
        setGenForm((p) => (p.templateId ? p : { ...p, templateId: firstActive.id }));
      }
      setLoading(false);

      const [cons, own, props, rens] = await Promise.all([
        getAllContracts(),
        getAllOwners(),
        getAllProperties(),
        getAllRenewalRequests(),
      ]);
      setContracts(cons);
      setOwners(own);
      setProperties(props);
      setRenewals(rens);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load contracts");
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
      category: categoryFilter,
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
      category: tpl.category || "other",
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

  useEffect(() => {
    if (!genForm.allocationId || !genForm.templateId) {
      setDocFields({});
      return undefined;
    }
    let cancelled = false;
    setFieldsLoading(true);
    previewContractDraft({
      allocationId: genForm.allocationId,
      templateId: genForm.templateId,
    })
      .then((result) => {
        if (cancelled) return;
        const template = templates.find((t) => t.id === genForm.templateId);
        const keys = extractPlaceholders(template?.body || "");
        const next = {};
        for (const key of keys) {
          next[key] = result.fields?.[key] || "";
        }
        setDocFields(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load tenant details");
      })
      .finally(() => {
        if (!cancelled) setFieldsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [genForm.allocationId, genForm.templateId, templates]);

  const livePreview = useMemo(() => {
    const template = templates.find((t) => t.id === genForm.templateId);
    if (!template || !Object.keys(docFields).length) return null;
    return renderContractTemplate(template.body, docFields);
  }, [templates, genForm.templateId, docFields]);

  const runGenerate = async () => {
    setSaving(true);
    setError("");
    try {
      const template = templates.find((t) => t.id === genForm.templateId);
      const result = await generateContractDraft(
        {
          allocationId: genForm.allocationId,
          templateId: genForm.templateId,
          fieldOverrides: docFields,
        },
        user.uid
      );
      await approveContract(result.id, user.uid);
      await downloadTextPdf({
        title: template?.name || "Rental document",
        body: result.preview?.body || "",
        filename: result.contractReference,
      });
      setDocFields({});
      setMessage(`Approved and downloaded ${result.contractReference}`);
      await load();
    } catch (err) {
      setError(
        err.missing?.length
          ? `Fill these fields first: ${err.missing.join(", ")}`
          : err.message || "Generation failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const onTemplateFile = async (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".txt")) {
      setError("Upload a .txt file. Fixed wording stays as normal text. Changing fields use {{name}} tokens.");
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setError("That file is empty.");
      return;
    }
    setError("");
    setTplForm((p) => ({
      ...p,
      body: text.replace(/^\uFEFF/, ""),
      name: p.name || file.name.replace(/\.txt$/i, ""),
    }));
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
      await load();
    } catch (err) {
      setError(err.message || "Renewal draft failed");
    } finally {
      setSaving(false);
    }
  };

  const visibleContracts = contracts.filter((c) =>
    matchesQuery(search, c.contractReference, c.applicantName, c.status, c.startDate, c.endDate, c.monthlyRent)
  );
  const visibleTemplates = templates.filter((t) =>
    matchesQuery(search, t.name, t.status, t.category, categoryLabel(t.category), ...(t.placeholders || []))
  );
  const visibleRenewals = renewals.filter((r) =>
    matchesQuery(search, r.applicantName, r.status, r.contractId)
  );
  const templatesInCategory = visibleTemplates.filter(
    (t) => (t.category || "other") === categoryFilter && t.status === "active"
  );
  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "";

  const chooseCategory = (value) => {
    setCategoryFilter(value);
    const next = activeTemplates.find((t) => (t.category || "other") === value);
    setGenForm((current) => ({ ...current, templateId: next?.id || "" }));
    setDocFields({});
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
        title="Rental documents"
        actions={
          <Button variant="outline" className="gap-1" onClick={openNewTemplate}>
            <FiUpload /> Upload template
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !templateModal && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search a template, tenant, or document" />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {DOCUMENT_CATEGORIES.map((item) => {
          const count = templates.filter(
            (t) => (t.category || "other") === item.value && t.status === "active"
          ).length;
          const active = categoryFilter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => chooseCategory(item.value)}
              className={`rounded-lg px-2 py-2 text-left ${
                active ? "bg-[#2C1810] text-white" : "bg-[#f6f3ef] text-[#2C1810]"
              }`}
            >
              <span className="block text-base font-semibold leading-none">{count}</span>
              <span className={`mt-1 block text-[10px] leading-tight ${active ? "text-white/80" : "text-[#2C1810]/60"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-gray-900">{categoryLabel(categoryFilter)}</p>
            <button type="button" className="text-xs font-medium text-primary" onClick={openNewTemplate}>
              Upload
            </button>
          </div>
          {templatesInCategory.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-gray-600">No {categoryLabel(categoryFilter).toLowerCase()} template yet.</p>
              <p className="mt-1 text-xs text-gray-400">Upload a .txt file. Fixed text stays as written. Changing fields use {"{{tenant_full_name}}"}.</p>
              <Button size="sm" className="mt-3 gap-1" onClick={openNewTemplate}>
                <FiUpload /> Upload .txt
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {templatesInCategory.map((t) => {
                const selected = genForm.templateId === t.id;
                return (
                  <li key={t.id} className={`flex items-center gap-2 px-3 py-2.5 ${selected ? "bg-[#fff4e8]" : ""}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setGenForm((current) => ({ ...current, templateId: t.id }));
                        setDocFields({});
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium text-gray-900">{t.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                        {(t.placeholders || []).length} fields · v{t.version}
                      </span>
                    </button>
                    <button type="button" className="shrink-0 text-[11px] font-medium text-primary" onClick={() => openVersion(t)}>
                      Replace
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="!p-3 sm:!p-4">
          <p className="text-sm font-semibold text-gray-900">Fill from a placed applicant</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Select
              label="Placed applicant"
              value={genForm.allocationId}
              onChange={(e) => setGenForm((p) => ({ ...p, allocationId: e.target.value }))}
              options={allocations.map((a) => ({
                value: a.id,
                label: `${a.applicantName || "Unnamed"}${propertyName(a.propertyId) ? ` · ${propertyName(a.propertyId)}` : ""}`,
              }))}
              placeholder="Select who was placed"
            />
            <Select
              label="Template"
              value={genForm.templateId}
              onChange={(e) => setGenForm((p) => ({ ...p, templateId: e.target.value }))}
              options={templatesInCategory.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select a template"
            />
          </div>
          {fieldsLoading && <p className="mt-3 text-sm text-gray-500">Loading name, address, and dates…</p>}
          {Object.keys(docFields).length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.keys(docFields).map((key) => (
                <Input
                  key={key}
                  label={fieldLabel(key)}
                  type={key.includes("date") ? "date" : "text"}
                  value={docFields[key]}
                  onChange={(e) => setDocFields((current) => ({ ...current, [key]: e.target.value }))}
                />
              ))}
            </div>
          )}
          {livePreview?.ok && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#f6f3ef] p-3 text-xs text-gray-800">
              {livePreview.body}
            </pre>
          )}
          {livePreview && !livePreview.ok && (
            <p className="mt-3 text-xs text-amber-700">
              Still empty: {livePreview.missing.map(fieldLabel).join(", ")}.
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              loading={saving}
              disabled={!genForm.allocationId || !genForm.templateId || !livePreview?.ok}
              onClick={runGenerate}
            >
              Approve and generate PDF
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-900">Generated documents</p>
        {visibleContracts.length === 0 ? (
          <p className="text-sm text-gray-500">
            {search ? "No documents match that search." : "Approved PDFs will be listed here."}
          </p>
        ) : (
          <div className="space-y-2">
            {visibleContracts.map((c) => (
              <Card key={c.id} className="!p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-gray-900">{c.applicantName || "Tenant"}</p>
                      <Badge>{statusLabel(CONTRACT_STATUSES, c.status)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {c.contractReference}
                      {c.startDate ? ` · ${c.startDate}` : ""}
                      {c.endDate ? ` to ${c.endDate}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewContract(c)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        downloadTextPdf({
                          title: c.contractReference,
                          body: c.body,
                          filename: c.contractReference,
                        }).catch((err) => setError(err.message || "PDF download failed"))
                      }
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {visibleRenewals.length > 0 && (
        <details className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-gray-800">
            Renewal requests ({visibleRenewals.length})
          </summary>
          <div className="mt-2 space-y-2">
            {visibleRenewals.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 border-t border-gray-100 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge>{statusLabel(RENEWAL_REQUEST_STATUSES, r.status)}</Badge>
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
            ))}
          </div>
        </details>
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
          <Select
            label="Document type"
            value={tplForm.category}
            onChange={(e) => setTplForm((p) => ({ ...p, category: e.target.value }))}
            options={DOCUMENT_CATEGORIES}
          />
          <label className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-[#2C1810]/25 bg-[#f6f3ef] px-3 py-4 text-center">
            <FiUpload className="h-4 w-4 text-[#2C1810]" />
            <span className="mt-1 text-sm font-medium text-[#2C1810]">Upload a .txt template</span>
            <span className="mt-0.5 text-[11px] text-[#2C1810]/60">Fixed sentences as normal text. Fields like {"{{tenant_full_name}}"}.</span>
            <input
              type="file"
              accept=".txt,text/plain"
              className="mt-2 block w-full text-xs text-gray-600"
              onChange={(e) => onTemplateFile(e.target.files?.[0])}
            />
          </label>
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
            hint="Fixed text stays as written. Changing fields must look like {{tenant_full_name}}. You can edit the text after the file loads."
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
            <div className="flex flex-wrap justify-end gap-2">
              {viewContract.status === "draft" && (
                <Button type="button" size="sm" onClick={() => onApprove(viewContract.id)}>
                  Approve
                </Button>
              )}
              {viewContract.status === "approved" && (
                <Button type="button" size="sm" variant="outline" onClick={() => onIssue(viewContract.id)}>
                  Issue to tenant
                </Button>
              )}
              {["draft", "approved", "issued"].includes(viewContract.status) && (
                <Button type="button" size="sm" variant="ghost" onClick={() => onVoid(viewContract.id)}>
                  Void
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  downloadTextPdf({
                    title: viewContract.contractReference,
                    body: viewContract.body,
                    filename: viewContract.contractReference,
                  }).catch((err) => setError(err.message || "PDF download failed"))
                }
              >
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
