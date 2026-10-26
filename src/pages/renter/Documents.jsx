import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  Spinner,
  Alert,
} from "../../components/ui";
import {
  FiFileText,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiFile,
  FiImage,
  FiFilePlus,
} from "react-icons/fi";
import {
  queryDocuments,
  COLLECTIONS,
  getContractsForTenant,
  getContractsVisibleToApplicant,
  createRenewalRequest,
  getRenewalRequestsForTenant,
} from "../../lib/firestore";
import {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  CONTRACT_STATUSES,
  getStatusConfig,
  formatDate,
  formatRelativeDate,
} from "../../lib/constants";
export default function RenterDocuments() {
  const { user, userProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewContract, setViewContract] = useState(null);
  const [renewMsg, setRenewMsg] = useState("");
  const [uploadData, setUploadData] = useState({
    documentType: "id_proof",
    fileName: "",
  });

  useEffect(() => {
    fetchDocuments();
  }, [user?.uid]);

  const fetchDocuments = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Get user's documents
      const docsData = await queryDocuments(
        COLLECTIONS.DOCUMENTS,
        [{ field: "ownerUserId", operator: "==", value: user.uid }],
        { field: "createdAt", direction: "desc" }
      );
      setDocuments(docsData);

      const [byTenant, byEmail, renewalRows] = await Promise.all([
        getContractsForTenant(user.uid),
        getContractsVisibleToApplicant(userProfile?.email || user.email),
        getRenewalRequestsForTenant(user.uid),
      ]);
      const map = new Map();
      [...byTenant, ...byEmail]
        .filter((c) => ["approved", "issued", "signed", "superseded"].includes(c.status))
        .forEach((c) => map.set(c.id, c));
      setContracts([...map.values()]);
      setRenewals(renewalRows);

      // Find active tenancy
      const memberships = await queryDocuments(
        COLLECTIONS.TENANCY_MEMBERS,
        [
          { field: "tenantUserId", operator: "==", value: user.uid },
          { field: "status", operator: "==", value: "active" },
        ]
      );

      if (memberships.length > 0) {
        // Get document requests for this user
        const requestsData = await queryDocuments(
          COLLECTIONS.DOCUMENT_REQUESTS,
          [{ field: "tenantUserId", operator: "==", value: user.uid }]
        );
        setDocumentRequests(requestsData);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestRenewal = async (contract) => {
    try {
      await createRenewalRequest(
        {
          contractId: contract.id,
          allocationId: contract.allocationId,
          propertyId: contract.propertyId,
          message: "Please renew my contract.",
        },
        user.uid
      );
      setRenewMsg("Renewal request submitted. A manager will review it.");
      await fetchDocuments();
    } catch (err) {
      setRenewMsg(err.message || "Could not submit renewal request");
    }
  };

  const pendingRequests = documentRequests.filter((r) => r.status === "requested");
  const uploadedDocs = documents.filter((d) => d.reviewStatus !== "rejected");
  const verifiedDocs = documents.filter((d) => d.reviewStatus === "accepted");

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
        subtitle="Manage your rental documents and verification"
        actions={
          <Button onClick={() => setShowUploadModal(true)} className="gap-2">
            <FiUpload className="h-4 w-4" />
            Upload Document
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{uploadedDocs.length}</p>
          <p className="text-sm text-gray-500">Uploaded Documents</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">{verifiedDocs.length}</p>
          <p className="text-sm text-gray-500">Verified</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500 text-center">
          <p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p>
          <p className="text-sm text-gray-500">Pending Requests</p>
        </Card>
      </div>

      {/* Pending Document Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Documents Needed</h3>
              <p className="mt-1 text-sm text-amber-700">
                Your landlord has requested the following documents. Please upload them as soon as possible.
              </p>
              <div className="mt-4 space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg bg-white p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {DOCUMENT_TYPES.find((t) => t.value === request.documentType)?.label || request.documentType}
                      </p>
                      {request.dueDate && (
                        <p className="text-sm text-gray-500">
                          Due by {formatDate(request.dueDate)}
                        </p>
                      )}
                      {request.notes && (
                        <p className="mt-1 text-sm text-gray-500">{request.notes}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setUploadData({
                          documentType: request.documentType,
                          documentRequestId: request.id,
                          fileName: "",
                        });
                        setShowUploadModal(true);
                      }}
                    >
                      <FiUpload className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {renewMsg && <Alert variant="info">{renewMsg}</Alert>}

      {/* Contracts (Phase 4) */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Approved or issued contracts will appear here. Drafts stay with the manager until approved.
          </p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.contractReference}</p>
                  <p className="text-sm text-gray-500">
                    {CONTRACT_STATUSES.find((s) => s.value === c.status)?.label || c.status}
                    {" · "}v{c.version}
                    {c.startDate ? ` · from ${c.startDate}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewContract(c)}>
                    View
                  </Button>
                  {["approved", "issued", "signed"].includes(c.status) && (
                    <Button size="sm" variant="ghost" onClick={() => requestRenewal(c)}>
                      Request renewal
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {renewals.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium uppercase text-gray-400">Your renewal requests</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {renewals.map((r) => (
                <li key={r.id}>
                  {r.status}
                  {r.requestedStartDate ? ` · ${r.requestedStartDate}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* My Documents */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">My Documents</h2>
        {documents.length === 0 ? (
          <EmptyState
            icon={FiFileText}
            title="No documents yet"
            description="Upload your rental documents for verification and easy access."
            action={
              <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                <FiUpload className="h-4 w-4" />
                Upload First Document
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => {
                  setSelectedDoc(doc);
                  setShowPreviewModal(true);
                }}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Document Types Info */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Commonly Required Documents</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TYPES.slice(0, 6).map((docType) => (
            <div
              key={docType.value}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <FiFile className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{docType.label}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {docType.value === "id_proof" && "Passport or government ID"}
                  {docType.value === "income_proof" && "Last 3 months payslips"}
                  {docType.value === "employment_letter" && "Current employer letter"}
                  {docType.value === "schufa" && "Credit report from SCHUFA"}
                  {docType.value === "previous_landlord" && "Reference letter"}
                  {docType.value === "bank_statement" && "Recent bank statements"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadData({ documentType: "id_proof", fileName: "" });
        }}
        title="Upload Document"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Document Type"
            options={DOCUMENT_TYPES}
            value={uploadData.documentType}
            onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Upload File
            </label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
              <div className="text-center">
                <FiUpload className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Drag and drop your file here
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  or click to browse
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  PDF, JPG, PNG up to 10MB
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              <strong>Privacy Note:</strong> Your documents are encrypted and securely stored. 
              Only you and your landlord can access them.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUploadModal(false);
                setUploadData({ documentType: "id_proof", fileName: "" });
              }}
            >
              Cancel
            </Button>
            <Button className="gap-2">
              <FiUpload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedDoc(null);
        }}
        title="Document Details"
        size="md"
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                <FiFileText className="h-8 w-8 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedDoc.fileName}</h3>
                <p className="text-sm text-gray-500">
                  {DOCUMENT_TYPES.find((t) => t.value === selectedDoc.documentType)?.label}
                </p>
                <Badge variant={getStatusConfig(DOCUMENT_STATUSES, selectedDoc.reviewStatus).color} className="mt-2">
                  {getStatusConfig(DOCUMENT_STATUSES, selectedDoc.reviewStatus).label}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-500">Uploaded</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedDoc.createdAt?.toDate?.() || selectedDoc.createdAt)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-500">File Size</p>
                <p className="font-medium text-gray-900">
                  {selectedDoc.fileSize ? `${(selectedDoc.fileSize / 1024).toFixed(1)} KB` : "—"}
                </p>
              </div>
            </div>

            {selectedDoc.reviewNote && (
              <div className={`rounded-lg p-4 ${
                selectedDoc.reviewStatus === "rejected" 
                  ? "border border-red-200 bg-red-50" 
                  : "border border-gray-200"
              }`}>
                <p className="font-medium text-gray-700">Review Note</p>
                <p className="mt-1 text-gray-600">{selectedDoc.reviewNote}</p>
              </div>
            )}

            {selectedDoc.expiresAt && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">
                  <strong>Expires:</strong> {formatDate(selectedDoc.expiresAt)}
                </p>
              </div>
            )}

            <div className="flex gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" className="flex-1 gap-2">
                <FiDownload className="h-4 w-4" />
                Download
              </Button>
              {selectedDoc.reviewStatus === "rejected" && (
                <Button className="flex-1 gap-2">
                  <FiUpload className="h-4 w-4" />
                  Re-upload
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!viewContract}
        onClose={() => setViewContract(null)}
        title={viewContract?.contractReference || "Contract"}
        size="lg"
      >
        {viewContract && (
          <div className="space-y-3">
            <Alert variant="warning">
              This is an issued record for your review. It is not automatically a signed legal
              document unless completed through the required signing process.
            </Alert>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm">
              {viewContract.body}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DocumentCard({ document, onView }) {
  const statusConfig = getStatusConfig(DOCUMENT_STATUSES, document.reviewStatus);
  const docType = DOCUMENT_TYPES.find((t) => t.value === document.documentType);

  const getIcon = () => {
    if (document.mimeType?.startsWith("image/")) {
      return FiImage;
    }
    return FiFileText;
  };

  const Icon = getIcon();

  return (
    <div
      className={`rounded-lg border p-4 ${
        document.reviewStatus === "rejected"
          ? "border-red-200 bg-red-50"
          : document.reviewStatus === "accepted"
          ? "border-green-200 bg-green-50"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${
            document.reviewStatus === "rejected"
              ? "bg-red-100"
              : document.reviewStatus === "accepted"
              ? "bg-green-100"
              : "bg-gray-100"
          }`}
        >
          <Icon
            className={`h-6 w-6 ${
              document.reviewStatus === "rejected"
                ? "text-red-600"
                : document.reviewStatus === "accepted"
                ? "text-green-600"
                : "text-gray-600"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{document.fileName}</p>
          <p className="text-sm text-gray-500">{docType?.label}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
        <Button variant="ghost" size="sm" onClick={onView}>
          <FiEye className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {formatRelativeDate(document.createdAt?.toDate?.() || document.createdAt)}
      </p>
    </div>
  );
}
