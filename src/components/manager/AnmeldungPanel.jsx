import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getDocument,
  COLLECTIONS,
  saveAnmeldungDocument,
  sendAnmeldungToTenant,
  getAllApplications,
} from "../../lib/firestore";
import {
  ANMELDUNG_FORM_FIELDS,
  buildAnmeldungDefaults,
  emptyAnmeldungFields,
  missingAnmeldungFields,
} from "../../lib/anmeldung";
import {
  downloadAnmeldungPdf,
  previewAnmeldungPdfUrl,
  anmeldungPdfFile,
} from "../../lib/anmeldungPdf";
import {
  Card,
  Button,
  Input,
  Select,
  Alert,
  Badge,
  Modal,
  Spinner,
} from "../ui";
import { FiDownload, FiEye, FiSend, FiSave } from "react-icons/fi";

const GROUPS = [
  { id: "provider", title: "1. Wohnungsgeber (housing provider)" },
  { id: "owner", title: "2. Eigentümer (only if different)" },
  { id: "move", title: "3. Move-in date" },
  { id: "unit", title: "4. Wohnung (rental address)" },
  { id: "person", title: "5. Person who moved in" },
  { id: "sign", title: "6. Signature line" },
];

export default function AnmeldungPanel({
  allocations = [],
  properties = [],
  owners = [],
  onSaved,
}) {
  const { user } = useAuth();
  const [allocationId, setAllocationId] = useState("");
  const [fields, setFields] = useState(emptyAnmeldungFields());
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedDoc, setSavedDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [livePreviewUrl, setLivePreviewUrl] = useState("");
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantOptions, setTenantOptions] = useState([]);
  const [sendTenantId, setSendTenantId] = useState("");
  const [sending, setSending] = useState(false);

  const missing = useMemo(() => missingAnmeldungFields(fields), [fields]);
  const selectedAllocation = allocations.find((a) => a.id === allocationId);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
    };
  }, [previewUrl, livePreviewUrl]);

  // Sharp live preview from the official AcroForm PDF (debounced)
  useEffect(() => {
    if (missing.length > 0) {
      setLivePreviewLoading(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLivePreviewLoading(true);
      try {
        const { url } = await previewAnmeldungPdfUrl(fields);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setLivePreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        // keep previous preview if generation fails mid-edit
      } finally {
        if (!cancelled) setLivePreviewLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fields, missing.length]);

  useEffect(() => {
    if (!allocationId) return;
    let cancelled = false;
    (async () => {
      setLoadingPrefill(true);
      setError("");
      try {
        const allocation =
          allocations.find((a) => a.id === allocationId) ||
          (await getDocument(COLLECTIONS.ALLOCATIONS, allocationId));
        const [property, application] = await Promise.all([
          allocation?.propertyId
            ? getDocument(COLLECTIONS.PROPERTIES, allocation.propertyId)
            : null,
          allocation?.applicationId
            ? getDocument(COLLECTIONS.APPLICATIONS, allocation.applicationId)
            : null,
        ]);
        let owner = null;
        const ownerRecordId = property?.ownerRecordId || allocation?.ownerRecordId;
        if (ownerRecordId) {
          owner = owners.find((o) => o.id === ownerRecordId) ||
            (await getDocument(COLLECTIONS.OWNERS, ownerRecordId));
        }
        if (cancelled) return;
        setFields(
          buildAnmeldungDefaults({
            allocation,
            property,
            owner,
            application,
          })
        );
        setSavedDoc(null);
        setSendTenantId(allocation?.tenantUserId || application?.renterId || "");
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not prefill from placement");
      } finally {
        if (!cancelled) setLoadingPrefill(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allocationId, allocations, owners]);

  useEffect(() => {
    getAllApplications()
      .then((apps) => {
        const fromAlloc = allocations.map((a) => ({
          id: a.tenantUserId || a.applicationId || a.id,
          tenantUserId: a.tenantUserId || null,
          applicationId: a.applicationId || null,
          allocationId: a.id,
          name: a.applicantName || "",
          email: a.applicantEmail || "",
          phone: a.applicantPhone || "",
        }));
        const fromApps = apps.map((a) => ({
          id: a.renterId || a.id,
          tenantUserId: a.renterId || null,
          applicationId: a.id,
          allocationId: a.allocationId || null,
          name: a.applicantName || "",
          email: a.applicantEmail || "",
          phone: a.applicantPhone || "",
        }));
        const map = new Map();
        for (const row of [...fromAlloc, ...fromApps]) {
          const key = row.tenantUserId || row.email || row.id;
          if (!map.has(key)) map.set(key, row);
        }
        setTenantOptions([...map.values()]);
      })
      .catch(() => setTenantOptions([]));
  }, [allocations]);

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    if (!q) return tenantOptions.slice(0, 40);
    return tenantOptions
      .filter((t) =>
        `${t.name} ${t.email} ${t.phone}`.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [tenantOptions, tenantSearch]);

  const setField = (key, value) =>
    setFields((current) => ({ ...current, [key]: value }));

  const handlePreview = async () => {
    setError("");
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const { url } = await previewAnmeldungPdfUrl(fields);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (err) {
      setError(err.message || "Preview failed");
    }
  };

  const handleSaveGenerate = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { dataUrl, filename } = await (async () => {
        const result = await import("../../lib/anmeldungPdf").then((m) =>
          m.generateAnmeldungPdf(fields)
        );
        return result;
      })();

      const property = selectedAllocation?.propertyId
        ? properties.find((p) => p.id === selectedAllocation.propertyId)
        : null;
      const saved = await saveAnmeldungDocument(
        {
          fields,
          allocationId: allocationId || null,
          applicationId: selectedAllocation?.applicationId || null,
          propertyId: selectedAllocation?.propertyId || property?.id || null,
          ownerRecordId: property?.ownerRecordId || null,
          tenantUserId: selectedAllocation?.tenantUserId || null,
          applicantName: selectedAllocation?.applicantName ||
            `${fields.tenantFirstName} ${fields.tenantLastName}`.trim(),
          applicantEmail: selectedAllocation?.applicantEmail || "",
          applicantPhone: selectedAllocation?.applicantPhone || "",
          pdfDataUrl: dataUrl.length < 700_000 ? dataUrl : null,
        },
        user.uid
      );
      setSavedDoc({ ...saved, filename, fields: { ...fields } });
      setMessage(`Saved ${saved.contractReference}. Preview or send to tenant.`);
      onSaved?.();
      await downloadAnmeldungPdf(fields, { filename });
    } catch (err) {
      setError(
        err.missing?.length
          ? `Fill these fields first: ${err.missing.join(", ")}`
          : err.message || "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!savedDoc?.id) {
      setError("Save and generate the Anmeldung first");
      return;
    }
    const tenant = tenantOptions.find(
      (t) => (t.tenantUserId || t.id) === sendTenantId
    );
    const tenantUserId = tenant?.tenantUserId;
    if (!tenantUserId) {
      setError(
        "That person has no login account yet. Create their login from Allocations, then send."
      );
      return;
    }
    setSending(true);
    setError("");
    try {
      const file = await anmeldungPdfFile(savedDoc.fields || fields, {
        filename: savedDoc.filename,
      });
      await sendAnmeldungToTenant(
        savedDoc.id,
        {
          tenantUserId,
          file,
          applicantName: tenant.name,
          applicantEmail: tenant.email,
          applicantPhone: tenant.phone,
        },
        user.uid
      );
      setMessage(`Anmeldung sent to ${tenant.name || tenant.email}`);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not send to tenant");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="!p-3 sm:!p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Anmeldung — Wohnungsgeberbestätigung
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Official blank form is fixed. Only the blue-box fields below are filled.
            </p>
          </div>
          <Badge variant="info">Fixed PDF template</Badge>
        </div>

        <div className="mt-3">
          <Select
            label="Prefill from placed applicant (optional)"
            value={allocationId}
            onChange={(e) => setAllocationId(e.target.value)}
            options={allocations.map((a) => ({
              value: a.id,
              label: `${a.applicantName || "Unnamed"}${
                a.propertyName || a.bedLabel
                  ? ` · ${a.propertyName || ""}${a.bedLabel ? ` · ${a.bedLabel}` : ""}`
                  : ""
              }`,
            }))}
            placeholder="Select a placement to prefill"
          />
        </div>

        {message && <Alert variant="success" className="mt-3">{message}</Alert>}
        {error && <Alert variant="error" className="mt-3">{error}</Alert>}
        {loadingPrefill && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Spinner size="sm" /> Loading placement details…
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="space-y-4">
            {GROUPS.map((group) => {
              const groupFields = ANMELDUNG_FORM_FIELDS.filter((f) => f.group === group.id);
              return (
                <div key={group.id}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {group.title}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groupFields.map((field) => {
                      const wide = [
                        "wohnungsgeberName",
                        "wohnungsgeberStreet",
                        "eigentuemerName",
                        "wohnungStreet",
                        "wohnungZusatz",
                        "signatureDatePlace",
                      ].includes(field.key);
                      return (
                        <div key={field.key} className={wide ? "sm:col-span-2" : ""}>
                          <Input
                            label={field.label}
                            required={field.required}
                            value={fields[field.key] || ""}
                            onChange={(e) => setField(field.key, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {missing.length > 0 && (
              <p className="text-xs text-amber-700">
                Still needed:{" "}
                {missing
                  .map((key) => ANMELDUNG_FORM_FIELDS.find((f) => f.key === key)?.label || key)
                  .join(", ")}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-1"
                disabled={missing.length > 0}
                onClick={handlePreview}
              >
                <FiEye /> Preview PDF
              </Button>
              <Button
                type="button"
                className="gap-1"
                loading={saving}
                disabled={missing.length > 0}
                onClick={handleSaveGenerate}
              >
                <FiSave /> Save & generate PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-1"
                disabled={missing.length > 0}
                onClick={() =>
                  downloadAnmeldungPdf(fields).catch((err) =>
                    setError(err.message || "Download failed")
                  )
                }
              >
                <FiDownload /> Download only
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Live PDF preview
              </p>
              {livePreviewLoading && (
                <span className="text-[11px] text-gray-400">Updating…</span>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-[#f6f3ef] shadow-sm">
              {livePreviewUrl ? (
                <iframe
                  title="Anmeldung live preview"
                  src={livePreviewUrl}
                  className="h-[36rem] w-full bg-white"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500">
                  {missing.length > 0
                    ? "Fill the required fields to see the official form filled in place."
                    : "Generating preview…"}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="!p-3 sm:!p-4">
        <p className="text-sm font-semibold text-gray-900">Send to tenant</p>
        <p className="mt-0.5 text-xs text-gray-500">
          Search and select the tenant account. They get the PDF in My documents plus a notification.
        </p>
        {!savedDoc && (
          <Alert variant="info" className="mt-3">
            Generate and save the Anmeldung first, then send it from here.
          </Alert>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            label="Search tenant"
            placeholder="Name, email, or phone"
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full gap-1 sm:w-auto"
              loading={sending}
              disabled={!savedDoc?.id || !sendTenantId}
              onClick={handleSend}
            >
              <FiSend /> Send PDF
            </Button>
          </div>
        </div>
        <Select
          className="mt-3"
          label="Tenant"
          value={sendTenantId}
          onChange={(e) => setSendTenantId(e.target.value)}
          options={filteredTenants
            .filter((t) => t.tenantUserId)
            .map((t) => ({
              value: t.tenantUserId,
              label: `${t.name || "Unnamed"}${t.email ? ` · ${t.email}` : ""}${
                t.tenantUserId ? "" : " (no login)"
              }`,
            }))}
          placeholder="Select tenant login"
        />
        {filteredTenants.some((t) => !t.tenantUserId) && (
          <p className="mt-2 text-xs text-gray-500">
            Tenants without a login are hidden from send. Create their login on Allocations first.
          </p>
        )}
      </Card>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Anmeldung preview"
        size="xl"
      >
        {previewUrl ? (
          <iframe title="Anmeldung PDF preview" src={previewUrl} className="h-[70vh] w-full rounded-lg border border-gray-100" />
        ) : (
          <Spinner />
        )}
      </Modal>
    </div>
  );
}
