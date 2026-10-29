import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllMaintenanceTickets,
  createMaintenanceTicket,
  updateRequestStatus,
  getAllProperties,
  getAllAllocations,
} from "../../lib/firestore";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_URGENCY,
  MAINTENANCE_STATUSES,
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
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import { FiTool, FiPlus } from "react-icons/fi";

export default function ManagerMaintenance() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "other",
    urgency: "medium",
    propertyId: "",
    allocationId: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rows, props, allocs] = await Promise.all([
        getAllMaintenanceTickets(),
        getAllProperties(),
        getAllAllocations(),
      ]);
      setTickets(rows);
      setProperties(props);
      setAllocations(allocs.filter((a) => ["reserved", "active"].includes(a.status)));
    } catch (err) {
      setError(err.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";

  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (!statusFilter || t.status === statusFilter) &&
          matchesQuery(search, t.title, t.category, t.status, t.applicantName, t.urgency, t.priority, propertyName(t.propertyId))
      ),
    [tickets, statusFilter, search, properties]
  );

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const alloc = allocations.find((a) => a.id === form.allocationId);
      await createMaintenanceTicket(
        {
          ...form,
          propertyId: form.propertyId || alloc?.propertyId || null,
          roomId: alloc?.roomId || null,
          bedId: alloc?.bedId || null,
          allocationId: form.allocationId || null,
          tenantUserId: alloc?.tenantUserId || null,
          applicantName: alloc?.applicantName || "",
        },
        user.uid
      );
      setModal(false);
      setMessage(
        form.urgency === "urgent"
          ? "Urgent ticket created — escalate with a human; no automated emergency dispatch."
          : "Ticket created"
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await updateRequestStatus(id, status, "", user.uid);
      setMessage(`Status → ${status}`);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
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
        title="Maintenance"
        subtitle="Tickets linked to property / allocation — human escalation for urgent issues"
        actions={
          <Button className="gap-2" onClick={() => setModal(true)}>
            <FiPlus /> New ticket
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !modal && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search title, property, or tenant" />

      <Select
        className="w-full sm:max-w-xs"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        options={MAINTENANCE_STATUSES}
        placeholder="All statuses"
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiTool}
            title={search ? "No matches" : "No tickets"}
            description={search ? "Nothing in this list matches that search." : "Create a maintenance ticket for an allocated room."}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id} className="!p-3 sm:!p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <h3 className="font-semibold text-gray-900">{t.title}</h3>
                    <Badge>{t.status}</Badge>
                    {(t.urgency || t.priority) === "urgent" && (
                      <Badge variant="danger">urgent</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {propertyName(t.propertyId)} · {t.category} ·{" "}
                    {t.applicantName || "—"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDetail(t)}>
                  Manage
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New maintenance ticket" size="lg">
        <form onSubmit={create} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              options={MAINTENANCE_CATEGORIES}
            />
            <Select
              label="Urgency"
              value={form.urgency}
              onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))}
              options={MAINTENANCE_URGENCY}
            />
            <Select
              label="Property"
              value={form.propertyId}
              onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))}
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Optional"
            />
            <Select
              label="Allocation"
              value={form.allocationId}
              onChange={(e) => setForm((p) => ({ ...p, allocationId: e.target.value }))}
              options={allocations.map((a) => ({
                value: a.id,
                label: `${a.applicantName || a.id.slice(0, 6)} · ${a.startDate || ""}`,
              }))}
              placeholder="Optional"
            />
          </div>
          <Alert variant="info">
            Urgent tickets notify the desk for human follow-up. There is no automated emergency
            dispatch.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.title || "Ticket"} size="md">
        {detail && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{detail.description || "No description"}</p>
            <Select
              label="Status"
              value={detail.status}
              onChange={(e) => setStatus(detail.id, e.target.value)}
              options={MAINTENANCE_STATUSES}
            />
            {(detail.statusHistory || []).length > 0 && (
              <div className="text-xs text-gray-500">
                <p className="font-medium">History</p>
                <ul className="mt-1 space-y-1">
                  {detail.statusHistory.slice(-8).map((h, i) => (
                    <li key={i}>
                      {h.from || "—"} → {h.to} · {h.at?.slice(0, 16)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
