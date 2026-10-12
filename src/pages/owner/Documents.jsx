import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  queryDocuments,
  reviewDocument,
  createDocumentRequest,
  createNotification,
  getTenanciesByOwner,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  getStatusConfig,
  formatDate,
  formatRelativeDate,
} from "../../lib/constants";
import {
  PageHeader,
  Card,
  EmptyState,
  Button,
  Badge,
  Modal,
  Select,
  Input,
  Spinner,
  Alert,
  Tabs,
} from "../../components/ui";
import { FiFileText, FiCheck, FiX, FiEye, FiPlus } from "react-icons/fi";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function OwnerDocuments() {
  const { user } = useAuth();
  const [tab, setTab] = useState("uploads");
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    tenancyId: "",
    tenantUserId: "",
    documentType: "id_proof",
    dueDate: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const ownerTenancies = await getTenanciesByOwner(user.uid);
      setTenancies(ownerTenancies);
      const tenancyIds = new Set(ownerTenancies.map((t) => t.id));

      const [allDocs, allRequests] = await Promise.all([
        queryDocuments(COLLECTIONS.DOCUMENTS, [], { field: "createdAt", direction: "desc" }),
        queryDocuments(COLLECTIONS.DOCUMENT_REQUESTS, [], { field: "createdAt", direction: "desc" }),
      ]);

      // Scope to this owner's tenancies (or documents uploaded in context of those tenancies)
      const scopedDocs = allDocs.filter(
        (d) => !d.relatedTenancyId || tenancyIds.has(d.relatedTenancyId)
      );
      // Further filter: only docs whose tenancy belongs to owner, or request tenants under owner tenancies
      const ownedDocs = [];
      for (const d of scopedDocs) {
        if (d.relatedTenancyId && tenancyIds.has(d.relatedTenancyId)) {
          ownedDocs.push(d);
          continue;
        }
        // Check if tenant is on one of owner's tenancies
        const memberships = await queryDocuments(COLLECTIONS.TENANCY_MEMBERS, [
          { field: "tenantUserId", operator: "==", value: d.ownerUserId },
        ]);
        if (memberships.some((m) => tenancyIds.has(m.tenancyId))) {
          ownedDocs.push(d);
        }
      }

      const ownedRequests = allRequests.filter((r) => tenancyIds.has(r.tenancyId));

      const docsWithUser = await Promise.all(
        ownedDocs.map(async (d) => ({
          ...d,
          user: await getDocument(COLLECTIONS.USERS, d.ownerUserId),
        }))
      );
      const reqsWithUser = await Promise.all(
        ownedRequests.map(async (r) => ({
          ...r,
          user: await getDocument(COLLECTIONS.USERS, r.tenantUserId),
        }))
      );

      setDocuments(docsWithUser);
      setRequests(reqsWithUser);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.uid]);

  const handleReview = async (status) => {
    if (!selected) return;
    setSaving(true);
    try {
      await reviewDocument(selected.id, status, reviewNote);
      await createNotification(selected.ownerUserId, "document_review", {
        title: status === "accepted" ? "Document accepted" : "Document needs attention",
        message:
          reviewNote ||
          `Your ${selected.documentType.replace(/_/g, " ")} was marked ${status}`,
        link: "/my-home/documents",
        entityType: "document",
        entityId: selected.id,
      });
      setSelected(null);
      setReviewNote("");
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await createDocumentRequest(
        reqForm.tenancyId,
        reqForm.tenantUserId,
        reqForm.documentType,
        { dueDate: reqForm.dueDate || null, notes: reqForm.notes }
      );
      await createNotification(reqForm.tenantUserId, "document_requested", {
        title: "Document requested",
        message: `Please upload: ${reqForm.documentType.replace(/_/g, " ")}`,
        link: "/my-home/documents",
        entityType: "document_request",
        entityId: id,
      });
      setRequestModal(false);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Review tenant verification files privately"
        actions={
          <Button className="gap-2" onClick={() => setRequestModal(true)}>
            <FiPlus className="h-4 w-4" />
            Request document
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Tabs
        tabs={[
          { id: "uploads", label: `Uploads (${documents.length})` },
          { id: "requests", label: `Requests (${requests.length})` },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "uploads" &&
        (documents.length === 0 ? (
          <Card>
            <EmptyState
              icon={FiFileText}
              title="No documents yet"
              description="Tenant uploads for your tenancies will appear here for review."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((docItem) => {
              const status = getStatusConfig(DOCUMENT_STATUSES, docItem.reviewStatus);
              return (
                <Card key={docItem.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {DOCUMENT_TYPES.find((t) => t.value === docItem.documentType)?.label ||
                          docItem.documentType}
                      </p>
                      <p className="text-sm text-gray-500">
                        {docItem.user?.displayName || docItem.ownerUserId} ·{" "}
                        {docItem.fileName || "file"} ·{" "}
                        {formatRelativeDate(toDate(docItem.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.color}>{status.label}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setSelected(docItem);
                          setReviewNote(docItem.reviewNote || "");
                        }}
                      >
                        <FiEye className="h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === "requests" &&
        (requests.length === 0 ? (
          <Card>
            <EmptyState
              icon={FiFileText}
              title="No document requests"
              description="Request ID, income proof, SCHUFA, or other files from tenants."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const status = getStatusConfig(DOCUMENT_STATUSES, r.status);
              return (
                <Card key={r.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {DOCUMENT_TYPES.find((t) => t.value === r.documentType)?.label ||
                          r.documentType}
                      </p>
                      <p className="text-sm text-gray-500">
                        {r.user?.displayName || r.tenantUserId}
                        {r.dueDate ? ` · due ${formatDate(r.dueDate)}` : ""}
                      </p>
                    </div>
                    <Badge variant={status.color}>{status.label}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Review document"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selected.fileName} · {selected.mimeType || "file"} ·{" "}
              {selected.user?.displayName}
            </p>
            {selected.storageKey?.startsWith("data:") || selected.storageKey?.startsWith("http") ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {selected.mimeType?.startsWith("image/") ||
                selected.storageKey?.startsWith("data:image") ? (
                  <img src={selected.storageKey} alt="" className="max-h-80 w-full object-contain" />
                ) : (
                  <a
                    href={selected.storageKey}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-4 text-primary underline"
                  >
                    Open file
                  </a>
                )}
              </div>
            ) : (
              <Alert variant="info">File stored as reference key (private storage URL pending).</Alert>
            )}
            <Input
              label="Review note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="danger"
                loading={saving}
                className="gap-1"
                onClick={() => handleReview("rejected")}
              >
                <FiX /> Reject
              </Button>
              <Button
                variant="success"
                loading={saving}
                className="gap-1"
                onClick={() => handleReview("accepted")}
              >
                <FiCheck /> Accept
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={requestModal}
        onClose={() => setRequestModal(false)}
        title="Request document"
      >
        <form onSubmit={handleRequest} className="space-y-4">
          <Select
            label="Tenancy"
            required
            value={reqForm.tenancyId}
            onChange={(e) => setReqForm((p) => ({ ...p, tenancyId: e.target.value }))}
            options={tenancies.map((t) => ({
              value: t.id,
              label: `${t.id.slice(0, 8)} · ${t.status} · ${formatDate(t.startDate)}`,
            }))}
          />
          <Input
            label="Tenant user ID"
            required
            value={reqForm.tenantUserId}
            onChange={(e) => setReqForm((p) => ({ ...p, tenantUserId: e.target.value }))}
          />
          <Select
            label="Document type"
            value={reqForm.documentType}
            onChange={(e) => setReqForm((p) => ({ ...p, documentType: e.target.value }))}
            options={DOCUMENT_TYPES}
          />
          <Input
            label="Due date"
            type="date"
            value={reqForm.dueDate}
            onChange={(e) => setReqForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
          <Input
            label="Notes"
            value={reqForm.notes}
            onChange={(e) => setReqForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRequestModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Send request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
