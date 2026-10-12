import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getTenanciesByOwner,
  getTenancyWithMembers,
  createTenancy,
  addTenantToTenancy,
  activateTenancy,
  createRentCharge,
  createDocumentRequest,
  createNotification,
  getUnitsByOwner,
  getApplicationsByOwner,
  getDocument,
  updateDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  TENANCY_STATUSES,
  DOCUMENT_TYPES,
  formatDate,
  formatCurrency,
} from "../../lib/constants";
import {
  PageHeader,
  Card,
  EmptyState,
  Button,
  Modal,
  Input,
  Select,
  Spinner,
  Alert,
  StatsCard,
  StatusBadge,
} from "../../components/ui";
import { FiUsers, FiPlus, FiHome, FiCalendar, FiCheck } from "react-icons/fi";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function OwnerTenancies() {
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState([]);
  const [units, setUnits] = useState([]);
  const [acceptedApps, setAcceptedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    unitId: "",
    applicationId: "",
    tenantUserId: "",
    startDate: "",
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    paymentDueDay: "1",
    agreementReference: "",
  });

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [t, u, apps] = await Promise.all([
        getTenanciesByOwner(user.uid),
        getUnitsByOwner(user.uid),
        getApplicationsByOwner(user.uid, "accepted"),
      ]);
      const withMembers = await Promise.all(
        t.map(async (tenancy) => {
          const full = await getTenancyWithMembers(tenancy.id);
          const unit = await getDocument(COLLECTIONS.UNITS, tenancy.unitId);
          return { ...full, unit };
        })
      );
      setTenancies(withMembers);
      setUnits(u);
      setAcceptedApps(apps);
    } catch (err) {
      console.error(err);
      setError("Failed to load tenancies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.uid]);

  const openCreate = (app = null) => {
    setError("");
    setForm({
      unitId: "",
      applicationId: app?.id || "",
      tenantUserId: app?.renterId || "",
      startDate: app?.desiredMoveIn || "",
      endDate: "",
      rentAmount: "",
      depositAmount: "",
      paymentDueDay: "1",
      agreementReference: "",
    });
    setModalOpen(true);
  };

  const onApplicationPick = (applicationId) => {
    const app = acceptedApps.find((a) => a.id === applicationId);
    setForm((p) => ({
      ...p,
      applicationId,
      tenantUserId: app?.renterId || p.tenantUserId,
      startDate: app?.desiredMoveIn || p.startDate,
    }));
  };

  const onUnitPick = (unitId) => {
    const unit = units.find((u) => u.id === unitId);
    setForm((p) => ({
      ...p,
      unitId,
      rentAmount: unit ? String(unit.rentAmount || "") : p.rentAmount,
      depositAmount: unit ? String(unit.depositAmount || "") : p.depositAmount,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.unitId || !form.tenantUserId || !form.startDate) {
      setError("Unit, tenant, and start date are required");
      return;
    }
    setSaving(true);
    try {
      const tenancyId = await createTenancy(user.uid, form.unitId, {
        applicationId: form.applicationId || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        rentAmount: Number(form.rentAmount) || 0,
        depositAmount: Number(form.depositAmount) || 0,
        paymentDueDay: Number(form.paymentDueDay) || 1,
        agreementReference: form.agreementReference,
      });

      await addTenantToTenancy(tenancyId, form.tenantUserId, {
        isPrimaryTenant: true,
        startDate: form.startDate,
        rentShareAmount: Number(form.rentAmount) || null,
      });

      // Request core verification documents
      for (const documentType of ["id_proof", "income_proof", "schufa"]) {
        await createDocumentRequest(tenancyId, form.tenantUserId, documentType, {
          required: true,
        });
      }

      await createNotification(form.tenantUserId, "tenancy_created", {
        title: "Tenancy created",
        message: "Your landlord started a tenancy. Upload requested documents.",
        link: "/my-home/tenancy",
        entityType: "tenancy",
        entityId: tenancyId,
      });

      if (form.applicationId) {
        await updateDocument(COLLECTIONS.APPLICATIONS, form.applicationId, {
          status: "accepted",
          tenancyId,
        });
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not create tenancy");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (tenancyId) => {
    setSaving(true);
    try {
      const tenancy = await getDocument(COLLECTIONS.TENANCIES, tenancyId);
      await activateTenancy(tenancyId);

      // First month rent charge
      const start = toDate(tenancy.startDate) || new Date();
      const periodEnd = new Date(start);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const due = new Date(start);
      due.setDate(tenancy.paymentDueDay || 1);

      const full = await getTenancyWithMembers(tenancyId);
      const primary = full.members?.find((m) => m.isPrimaryTenant) || full.members?.[0];

      await createRentCharge(tenancyId, {
        responsibleTenantId: primary?.tenantUserId || null,
        periodStart: start.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        dueDate: due.toISOString().slice(0, 10),
        amount: tenancy.rentAmount,
      });

      if (primary?.tenantUserId) {
        await createNotification(primary.tenantUserId, "tenancy_active", {
          title: "Tenancy activated",
          message: "Your tenancy is now active. Check rent & documents.",
          link: "/my-home/tenancy",
          entityType: "tenancy",
          entityId: tenancyId,
        });
      }

      await load();
    } catch (err) {
      alert(err.message || "Activation failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = tenancies.filter((t) => !statusFilter || t.status === statusFilter);

  const stats = {
    active: tenancies.filter((t) => t.status === "active").length,
    upcoming: tenancies.filter((t) => ["upcoming", "awaiting_documents", "awaiting_payment", "draft"].includes(t.status)).length,
    ended: tenancies.filter((t) => t.status === "ended").length,
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
        title="Tenancies"
        subtitle="Confirmed rental relationships — not inquiries"
        actions={
          <Button className="gap-2" onClick={() => openCreate()}>
            <FiPlus className="h-4 w-4" />
            New tenancy
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Active" value={String(stats.active)} icon={FiCheck} />
        <StatsCard label="Upcoming / pending" value={String(stats.upcoming)} icon={FiCalendar} />
        <StatsCard label="Ended" value={String(stats.ended)} icon={FiHome} />
      </div>

      <div className="flex gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={TENANCY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          placeholder="All statuses"
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiUsers}
            title="No tenancies yet"
            description="Accept an application, then create a tenancy for the unit. Units stay available until activation."
            action={
              <Button onClick={() => openCreate()}>Create tenancy</Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {t.unit?.unitName || "Unit"} · {formatCurrency(t.rentAmount, t.currency)}/mo
                    </h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(t.startDate)}
                    {t.endDate ? ` → ${formatDate(t.endDate)}` : " → open-ended"}
                    {" · "}
                    {(t.members || []).length} tenant(s)
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {(t.members || [])
                      .map((m) => m.user?.displayName || m.tenantUserId)
                      .join(", ") || "No members yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetail(t)}>
                    Details
                  </Button>
                  {t.status !== "active" && t.status !== "ended" && t.status !== "cancelled" && (
                    <Button size="sm" loading={saving} onClick={() => handleActivate(t.id)}>
                      Activate
                    </Button>
                  )}
                  <ButtonLinkLike to={`/dashboard/rent`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create tenancy" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Select
            label="From accepted application (optional)"
            value={form.applicationId}
            onChange={(e) => onApplicationPick(e.target.value)}
            options={acceptedApps.map((a) => ({
              value: a.id,
              label: `${a.listingTitle} · ${a.renterId.slice(0, 6)}`,
            }))}
            placeholder="Select application"
          />
          <Select
            label="Unit"
            required
            value={form.unitId}
            onChange={(e) => onUnitPick(e.target.value)}
            options={units
              .filter((u) => u.status === "available" || u.status === "reserved")
              .map((u) => ({
                value: u.id,
                label: `${u.unitName} · ${formatCurrency(u.rentAmount)} (${u.status})`,
              }))}
          />
          <Input
            label="Primary tenant user ID"
            required
            value={form.tenantUserId}
            onChange={(e) => setForm((p) => ({ ...p, tenantUserId: e.target.value }))}
            hint="Filled automatically from an accepted application"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
            <Input
              label="Rent amount (€)"
              type="number"
              value={form.rentAmount}
              onChange={(e) => setForm((p) => ({ ...p, rentAmount: e.target.value }))}
            />
            <Input
              label="Deposit (€)"
              type="number"
              value={form.depositAmount}
              onChange={(e) => setForm((p) => ({ ...p, depositAmount: e.target.value }))}
            />
            <Input
              label="Payment due day"
              type="number"
              min="1"
              max="28"
              value={form.paymentDueDay}
              onChange={(e) => setForm((p) => ({ ...p, paymentDueDay: e.target.value }))}
            />
            <Input
              label="Agreement reference"
              value={form.agreementReference}
              onChange={(e) => setForm((p) => ({ ...p, agreementReference: e.target.value }))}
            />
          </div>
          <Alert variant="info">
            Creating a tenancy does not mark the unit rented until you activate it.
            ID, income, and SCHUFA document requests are sent to the tenant.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create draft tenancy
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Tenancy details"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <StatusBadge status={detail.status} />
            <p className="text-sm text-gray-600">
              Unit: {detail.unit?.unitName} · Rent {formatCurrency(detail.rentAmount)}
            </p>
            <p className="text-sm text-gray-600">
              Period: {formatDate(detail.startDate)}
              {detail.endDate ? ` – ${formatDate(detail.endDate)}` : ""}
            </p>
            <div>
              <p className="mb-2 font-medium text-gray-900">Members</p>
              <ul className="space-y-2">
                {(detail.members || []).map((m) => (
                  <li key={m.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    {m.user?.displayName || m.tenantUserId}
                    {m.isPrimaryTenant ? " (primary)" : ""}
                    {m.rentShareAmount != null
                      ? ` · share ${formatCurrency(m.rentShareAmount)}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              Docs requested: {DOCUMENT_TYPES.slice(0, 3).map((d) => d.label).join(", ")}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ButtonLinkLike() {
  return (
    <Link
      to="/dashboard/documents"
      className="inline-flex items-center justify-center rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Documents
    </Link>
  );
}
