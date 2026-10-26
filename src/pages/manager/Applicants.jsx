import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllApplications,
  getAllProperties,
  createStaffApplication,
  updateApplicationStatus,
  updateApplicationNotes,
  getRoomsByProperty,
} from "../../lib/firestore";
import { APPLICATION_STATUSES } from "../../lib/constants";
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
} from "../../components/ui";
import { FiPlus, FiInbox, FiKey } from "react-icons/fi";

const PIPELINE = [
  "new",
  "under_review",
  "more_information_requested",
  "viewing_scheduled",
  "approved",
  "allocated",
  "rejected",
  "withdrawn",
  "closed",
];

const statusLabel = (value) =>
  APPLICATION_STATUSES.find((s) => s.value === value)?.label || value.replace(/_/g, " ");

export default function ManagerApplicants() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [apps, setApps] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    propertyId: "",
    roomId: "",
    requestedRoomType: "",
    desiredMoveIn: "",
    intendedDuration: "",
    numberOfOccupants: "1",
    message: "",
    internalNotes: "",
  });
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, props] = await Promise.all([getAllApplications(), getAllProperties()]);
      setApps(rows);
      setProperties(props);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.propertyId) {
      setRooms([]);
      return;
    }
    getRoomsByProperty(form.propertyId)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [form.propertyId]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (propertyFilter && a.propertyId !== propertyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${a.applicantName || ""} ${a.applicantEmail || ""} ${a.listingTitle || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, statusFilter, propertyFilter, search]);

  const counts = useMemo(() => {
    const map = {};
    for (const s of PIPELINE) map[s] = apps.filter((a) => a.status === s).length;
    return map;
  }, [apps]);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";

  const openCreate = () => {
    setForm({
      applicantName: "",
      applicantEmail: "",
      applicantPhone: "",
      propertyId: propertyFilter || "",
      roomId: "",
      requestedRoomType: "",
      desiredMoveIn: "",
      intendedDuration: "",
      numberOfOccupants: "1",
      message: "",
      internalNotes: "",
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createStaffApplication(
        {
          ...form,
          numberOfOccupants: Number(form.numberOfOccupants) || 1,
        },
        user.uid
      );
      setCreateOpen(false);
      setMessage("Application recorded");
      await load();
    } catch (err) {
      setError(err.message || "Could not create application");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (app) => {
    setDetail(app);
    setNotesDraft(app.internalNotes || "");
    setStatusDraft(app.status);
    setDecisionNote(app.decisionNote || "");
  };

  const saveNotes = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateApplicationNotes(detail.id, notesDraft, user.uid);
      setMessage("Notes saved");
      await load();
      setDetail((d) => (d ? { ...d, internalNotes: notesDraft } : d));
    } catch (err) {
      setError(err.message || "Could not save notes");
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      await updateApplicationStatus(detail.id, statusDraft, decisionNote, user.uid);
      setMessage(`Status → ${statusLabel(statusDraft)}`);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message || "Could not update status");
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
        title="Applicants"
        subtitle="Review enquiries and applications before allocating a bed"
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <FiPlus /> Record application
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !createOpen && !detail && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            !statusFilter ? "bg-primary text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          All ({apps.length})
        </button>
        {PIPELINE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              statusFilter === s ? "bg-primary text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
            }`}
          >
            {statusLabel(s)} ({counts[s] || 0})
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="All properties"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiInbox}
            title="No applications"
            description="Record a walk-in enquiry or wait for renters to apply from a listing."
            action={<Button onClick={openCreate}>Record application</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <Card key={app.id} className="!p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {app.applicantName || "Unnamed applicant"}
                    </h3>
                    <Badge variant="info">{statusLabel(app.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {app.applicantEmail || "No email"}
                    {app.applicantPhone ? ` · ${app.applicantPhone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {propertyName(app.propertyId) !== "—"
                      ? propertyName(app.propertyId)
                      : app.listingTitle || "No property"}
                    {app.desiredMoveIn ? ` · move-in ${app.desiredMoveIn}` : ""}
                    {app.requestedRoomType ? ` · ${app.requestedRoomType}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDetail(app)}>
                    Review
                  </Button>
                  {["approved", "accepted"].includes(app.status) && (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/manager/allocations?applicationId=${app.id}`)}
                    >
                      <FiKey /> Allocate bed
                    </Button>
                  )}
                  {app.status === "allocated" && app.allocationId && (
                    <Link
                      to={`/manager/allocations?highlight=${app.allocationId}`}
                      className="inline-flex items-center rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                    >
                      View allocation
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Record application"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.applicantName}
              onChange={(e) => setForm((p) => ({ ...p, applicantName: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.applicantEmail}
              onChange={(e) => setForm((p) => ({ ...p, applicantEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.applicantPhone}
              onChange={(e) => setForm((p) => ({ ...p, applicantPhone: e.target.value }))}
            />
            <Input
              label="Desired move-in"
              type="date"
              value={form.desiredMoveIn}
              onChange={(e) => setForm((p) => ({ ...p, desiredMoveIn: e.target.value }))}
            />
          </div>
          <Select
            label="Property"
            required
            value={form.propertyId}
            onChange={(e) =>
              setForm((p) => ({ ...p, propertyId: e.target.value, roomId: "" }))
            }
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select property"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Preferred room (optional)"
              value={form.roomId}
              onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
              options={rooms.map((r) => ({ value: r.id, label: r.label }))}
              placeholder="Any / not specified"
            />
            <Input
              label="Requested room type"
              value={form.requestedRoomType}
              onChange={(e) => setForm((p) => ({ ...p, requestedRoomType: e.target.value }))}
              placeholder="e.g. private, shared"
            />
            <Input
              label="Intended duration"
              value={form.intendedDuration}
              onChange={(e) => setForm((p) => ({ ...p, intendedDuration: e.target.value }))}
              placeholder="e.g. 6 months"
            />
            <Input
              label="Occupants"
              type="number"
              min={1}
              value={form.numberOfOccupants}
              onChange={(e) => setForm((p) => ({ ...p, numberOfOccupants: e.target.value }))}
            />
          </div>
          <Textarea
            label="Applicant message"
            rows={2}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          />
          <Textarea
            label="Internal notes (staff only)"
            rows={2}
            value={form.internalNotes}
            onChange={(e) => setForm((p) => ({ ...p, internalNotes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.applicantName || "Application"}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-gray-600">
              {detail.applicantEmail} · {propertyName(detail.propertyId)} ·{" "}
              {statusLabel(detail.status)}
            </p>
            {detail.message && (
              <Card className="!p-3">
                <p className="text-xs font-medium text-gray-500">Message</p>
                <p className="mt-1 text-sm text-gray-800">{detail.message}</p>
              </Card>
            )}
            <Select
              label="Status"
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              options={PIPELINE.map((s) => ({ value: s, label: statusLabel(s) }))}
              disabled={detail.status === "allocated"}
            />
            <Textarea
              label="Decision / reply note"
              rows={2}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            <Textarea
              label="Internal notes"
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button type="button" variant="outline" loading={saving} onClick={saveNotes}>
                Save notes
              </Button>
              {detail.status !== "allocated" && (
                <Button type="button" loading={saving} onClick={saveStatus}>
                  Update status
                </Button>
              )}
              {["approved", "accepted"].includes(statusDraft) && detail.status !== "allocated" && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setDetail(null);
                    navigate(`/manager/allocations?applicationId=${detail.id}`);
                  }}
                >
                  <FiKey /> Allocate
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
