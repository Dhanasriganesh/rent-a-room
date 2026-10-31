import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getOwnerDossier,
  updateOwnerRecord,
} from "../../lib/firestore";
import {
  APPLICATION_STATUSES,
  CONTRACT_STATUSES,
  formatDate,
} from "../../lib/constants";
import {
  PageHeader,
  Card,
  Button,
  Spinner,
  Modal,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  OpenInWhatsApp,
} from "../../components/ui";
import {
  FiArrowLeft,
  FiEdit2,
  FiHome,
  FiLayers,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";

const statusLabel = (value, list) =>
  list.find((s) => s.value === value)?.label || String(value || "").replace(/_/g, " ");

const bedTone = (status) => {
  if (status === "available") return "success";
  if (status === "occupied" || status === "reserved") return "warning";
  if (status === "blocked" || status === "maintenance") return "danger";
  return "default";
};

export default function ManagerOwnerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    legalName: "",
    contactEmail: "",
    phoneNumber: "",
    address: "",
    preferredContactChannel: "email",
    notes: "",
    status: "active",
    linkedUserId: "",
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getOwnerDossier(id);
      setDossier(data);
      const owner = data.owner;
      setForm({
        fullName: owner.fullName || "",
        legalName: owner.legalName || "",
        contactEmail: owner.contactEmail || "",
        phoneNumber: owner.phoneNumber || "",
        address: owner.address || "",
        preferredContactChannel: owner.preferredContactChannel || "email",
        notes: owner.notes || "",
        status: owner.status || "active",
        linkedUserId: owner.linkedUserId || "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load owner");
      setDossier(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateOwnerRecord(
        id,
        {
          ...form,
          linkedUserId: form.linkedUserId.trim() || null,
        },
        user.uid
      );
      setEditOpen(false);
      setMessage("Owner updated");
      await load();
    } catch (err) {
      setError(err.message || "Could not save owner");
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

  if (!dossier?.owner) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-1" onClick={() => navigate("/manager/owners")}>
          <FiArrowLeft /> Back to owners
        </Button>
        <Alert variant="error">{error || "Owner not found"}</Alert>
      </div>
    );
  }

  const { owner, linkedUser, properties, applications, allocations, contracts, totals } =
    dossier;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary"
          onClick={() => navigate("/manager/owners")}
        >
          <FiArrowLeft /> Owners
        </button>
        <PageHeader
          title={owner.fullName || "Owner"}
          subtitle={owner.contactEmail || owner.legalName || ""}
          actions={
            <div className="flex flex-wrap gap-2">
              <OpenInWhatsApp phone={owner.phoneNumber} always />
              <Button variant="outline" className="gap-1" onClick={() => setEditOpen(true)}>
                <FiEdit2 /> Edit
              </Button>
              <Link
                to={`/manager/properties?ownerRecordId=${owner.id}`}
                className="inline-flex items-center rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              >
                Properties
              </Link>
            </div>
          }
        />
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && !editOpen && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Properties</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{properties.length}</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Rooms / beds</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {totals.rooms} / {totals.beds}
          </p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Bed status</p>
          <p className="mt-1 text-sm text-gray-800">
            {totals.available} free · {totals.reserved} reserved · {totals.occupied} occupied
          </p>
        </Card>
        <Card className="!p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Pipeline</p>
          <p className="mt-1 text-sm text-gray-800">
            {applications.length} applicants · {allocations.length} allocations ·{" "}
            {contracts.length} docs
          </p>
        </Card>
      </div>

      <Card className="!p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Contact & profile</h2>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Full name</dt>
            <dd className="text-gray-800">{owner.fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Legal name</dt>
            <dd className="text-gray-800">{owner.legalName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Email</dt>
            <dd className="flex items-center gap-1.5 break-all text-gray-800">
              <FiMail className="shrink-0 text-gray-400" />
              {owner.contactEmail || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Phone</dt>
            <dd className="flex flex-wrap items-center gap-2 text-gray-800">
              <span className="inline-flex items-center gap-1.5">
                <FiPhone className="shrink-0 text-gray-400" />
                {owner.phoneNumber || "—"}
              </span>
              <OpenInWhatsApp phone={owner.phoneNumber} always size="xs" />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Preferred contact</dt>
            <dd className="text-gray-800">{owner.preferredContactChannel || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Status</dt>
            <dd>
              <Badge variant={owner.status === "active" ? "success" : "default"}>
                {owner.status || "—"}
              </Badge>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-gray-400">Address</dt>
            <dd className="text-gray-800">{owner.address || "—"}</dd>
          </div>
          {owner.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Internal notes</dt>
              <dd className="mt-1 rounded-lg bg-[#f6f3ef] px-3 py-2 text-gray-800">{owner.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card className="!p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <FiUser /> Linked login account
        </h2>
        {linkedUser ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Display name</dt>
              <dd className="text-gray-800">{linkedUser.displayName || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Email</dt>
              <dd className="break-all text-gray-800">{linkedUser.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">Role / status</dt>
              <dd className="text-gray-800">
                {linkedUser.role || "—"}
                {linkedUser.accountStatus ? ` · ${linkedUser.accountStatus}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-gray-400">User ID</dt>
              <dd className="break-all font-mono text-xs text-gray-600">{linkedUser.id}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            No Firebase login linked. Edit the owner to paste an Auth UID when available.
          </p>
        )}
      </Card>

      <Card className="!p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <FiHome /> Properties & beds
          </h2>
          <Link
            to={`/manager/properties?ownerRecordId=${owner.id}`}
            className="text-xs font-medium text-primary"
          >
            Manage properties
          </Link>
        </div>
        {!properties.length ? (
          <p className="text-sm text-gray-500">No properties attached to this owner yet.</p>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property.id}
                className="rounded-lg border border-gray-100 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{property.name}</p>
                    <p className="text-sm text-gray-500">
                      {[property.address, property.postalCode, property.city]
                        .filter(Boolean)
                        .join(", ") || "No address"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {property.roomCount} rooms · {property.bedCount} beds ·{" "}
                      {property.availableBeds} available
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={property.status === "active" ? "success" : "default"}>
                      {property.status || "—"}
                    </Badge>
                    <Link
                      to={`/manager/inventory?propertyId=${property.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                    >
                      <FiLayers /> Rooms & beds
                    </Link>
                  </div>
                </div>
                {property.beds?.length > 0 && (
                  <ul className="mt-3 divide-y divide-gray-50 rounded-md border border-gray-50">
                    {property.beds.map((bed) => (
                      <li
                        key={bed.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 text-sm"
                      >
                        <span className="text-gray-800">
                          {bed.roomLabel ? `${bed.roomLabel} · ` : ""}
                          {bed.label}
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant={bedTone(bed.status)}>{bed.status}</Badge>
                          {bed.occupantName || bed.occupantEmail ? (
                            bed.applicationId ? (
                              <Link
                                to={`/manager/applicants?open=${bed.applicationId}`}
                                className="text-xs font-medium text-primary"
                              >
                                {bed.occupantName || bed.occupantEmail}
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-600">
                                {bed.occupantName || bed.occupantEmail}
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">No applicant</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Applicants</h2>
            <Link to="/manager/applicants" className="text-xs font-medium text-primary">
              All applicants
            </Link>
          </div>
          {!applications.length ? (
            <p className="text-sm text-gray-500">No applicants for this owner’s properties.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {applications.slice(0, 20).map((app) => (
                <li key={app.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <Link
                      to={`/manager/applicants?open=${app.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {app.applicantName || "Unnamed"}
                    </Link>
                    <p className="truncate text-xs text-gray-500">
                      {app.propertyName || app.listingTitle || "Property"}
                      {app.bedLabel
                        ? ` · ${[app.roomLabel, app.bedLabel].filter(Boolean).join(" · ")}`
                        : ""}
                    </p>
                    <div className="mt-1">
                      <OpenInWhatsApp phone={app.applicantPhone} size="xs" />
                    </div>
                  </div>
                  <Badge>
                    {statusLabel(app.status, APPLICATION_STATUSES)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="!p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">Allocations</h2>
            <Link to="/manager/allocations" className="text-xs font-medium text-primary">
              All allocations
            </Link>
          </div>
          {!allocations.length ? (
            <p className="text-sm text-gray-500">No bed allocations yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allocations.slice(0, 20).map((row) => (
                <li key={row.id} className="py-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {row.applicantName || row.applicantEmail || "Tenant"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[row.propertyName, row.roomLabel, row.bedLabel].filter(Boolean).join(" · ")}
                    {row.startDate ? ` · from ${formatDate(row.startDate)}` : ""}
                    {row.status ? ` · ${row.status}` : ""}
                  </p>
                  <div className="mt-1">
                    <OpenInWhatsApp phone={row.applicantPhone} size="xs" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="!p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Rental documents</h2>
          <Link to="/manager/contracts" className="text-xs font-medium text-primary">
            All documents
          </Link>
        </div>
        {!contracts.length ? (
          <p className="text-sm text-gray-500">No rental documents for this owner yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {contracts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {c.title || c.contractReference || "Document"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.applicantName || c.tenantName || c.applicantEmail || ""}
                    {c.propertyName ? ` · ${c.propertyName}` : ""}
                  </p>
                  <div className="mt-1">
                    <OpenInWhatsApp
                      phone={c.applicantPhone || c.fieldValues?.tenant_phone}
                      size="xs"
                    />
                  </div>
                </div>
                <Badge>{statusLabel(c.status, CONTRACT_STATUSES)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit owner"
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
            <Input
              label="Legal name"
              value={form.legalName}
              onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
            />
            <Input
              label="Contact email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phoneNumber}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
            />
            <Select
              label="Preferred contact"
              value={form.preferredContactChannel}
              onChange={(e) =>
                setForm((p) => ({ ...p, preferredContactChannel: e.target.value }))
              }
              options={[
                { value: "email", label: "Email" },
                { value: "phone", label: "Phone" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <Input
            label="Linked Firebase user ID (optional)"
            value={form.linkedUserId}
            onChange={(e) => setForm((p) => ({ ...p, linkedUserId: e.target.value }))}
            hint="If this owner has an owner-role login, paste their Auth UID"
          />
          <Textarea
            label="Internal notes (staff only)"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
