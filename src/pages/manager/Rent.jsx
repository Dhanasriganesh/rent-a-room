import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllRentCharges,
  getAllProperties,
  generateMonthlyRentCharges,
  recordRentPayment,
  adjustRentCharge,
  refreshRentChargeStatuses,
  getPaymentsForCharge,
  rentPeriodKey,
} from "../../lib/firestore";
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
  StatsCard,
} from "../../components/ui";
import { FiDollarSign, FiRefreshCw } from "react-icons/fi";

const STATUS_OPTS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "due", label: "Due" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "disputed", label: "Under review" },
  { value: "waived", label: "Waived" },
  { value: "cancelled", label: "Cancelled" },
];

const badgeFor = (status) => {
  if (status === "paid") return "success";
  if (status === "overdue" || status === "disputed") return "danger";
  if (status === "partial" || status === "due") return "warning";
  return "default";
};

export default function ManagerRent() {
  const { user } = useAuth();
  const now = new Date();
  const [charges, setCharges] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [periodFilter, setPeriodFilter] = useState(rentPeriodKey(now.getFullYear(), now.getMonth() + 1));
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [search, setSearch] = useState("");

  const [genYear, setGenYear] = useState(String(now.getFullYear()));
  const [genMonth, setGenMonth] = useState(String(now.getMonth() + 1));
  const [dueDay, setDueDay] = useState("1");

  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "bank_transfer",
    reference: "",
    paymentDate: now.toISOString().slice(0, 10),
    notes: "",
  });
  const [payments, setPayments] = useState([]);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, props] = await Promise.all([getAllRentCharges(), getAllProperties()]);
      setCharges(rows);
      setProperties(props);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load rent ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return charges.filter((c) => {
      if (periodFilter && c.period !== periodFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (propertyFilter && c.propertyId !== propertyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.applicantName || ""} ${c.applicantEmail || ""} ${c.period || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [charges, periodFilter, statusFilter, propertyFilter, search]);

  const stats = useMemo(() => {
    const open = charges.filter((c) => !["paid", "waived", "cancelled"].includes(c.status));
    const overdue = charges.filter((c) => c.status === "overdue");
    const dueTotal = open.reduce(
      (s, c) => s + Math.max(0, Number(c.balance ?? (c.amountDue ?? c.amount) - (c.paidAmount || 0))),
      0
    );
    const paidThisPeriod = charges
      .filter((c) => c.period === periodFilter)
      .reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
    return {
      open: open.length,
      overdue: overdue.length,
      dueTotal,
      paidThisPeriod,
    };
  }, [charges, periodFilter]);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";

  const runGenerate = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await generateMonthlyRentCharges(
        {
          year: Number(genYear),
          month: Number(genMonth),
          dueDay: Number(dueDay) || 1,
        },
        user.uid
      );
      setMessage(
        `Period ${result.period}: ${result.created.length} created, ${result.skipped.length} skipped, ${result.flagged.length} flagged for review. Safe to rerun.`
      );
      setPeriodFilter(result.period);
      await load();
    } catch (err) {
      setError(err.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const runRefresh = async () => {
    setBusy(true);
    try {
      const { updated } = await refreshRentChargeStatuses(user.uid);
      setMessage(`Refreshed statuses (${updated} updated)`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openPay = async (charge) => {
    const balance = Math.max(
      0,
      Number(charge.balance ?? (charge.amountDue ?? charge.amount) - (charge.paidAmount || 0))
    );
    setPayModal(charge);
    setPayForm({
      amount: String(balance || charge.amountDue || charge.amount || ""),
      method: "bank_transfer",
      reference: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    try {
      setPayments(await getPaymentsForCharge(charge.id));
    } catch {
      setPayments([]);
    }
  };

  const submitPay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await recordRentPayment(
        payModal.id,
        {
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference,
          paymentDate: payForm.paymentDate,
          notes: payForm.notes,
        },
        user.uid
      );
      setMessage(`Payment recorded — status ${result.status}, balance €${result.balance}`);
      setPayModal(null);
      await load();
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adjustRentCharge(
        adjustModal.id,
        { amountDue: Number(adjustAmount), reason: adjustReason },
        user.uid
      );
      setMessage("Charge adjusted");
      setAdjustModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const waive = async (charge) => {
    const reason = prompt("Waiver reason (required for audit):");
    if (!reason) return;
    try {
      await adjustRentCharge(charge.id, { waive: true, reason }, user.uid);
      setMessage("Charge waived");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const periodOptions = useMemo(() => {
    const set = new Set(charges.map((c) => c.period).filter(Boolean));
    set.add(periodFilter);
    set.add(rentPeriodKey(now.getFullYear(), now.getMonth() + 1));
    return [...set].sort().reverse().map((p) => ({ value: p, label: p }));
  }, [charges, periodFilter]);

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
        title="Rent management"
        subtitle="Ledger, monthly generation, and manual payment recording"
        actions={
          <Button variant="outline" className="gap-2" loading={busy} onClick={runRefresh}>
            <FiRefreshCw /> Refresh statuses
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !payModal && !adjustModal && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Open charges" value={stats.open} icon={FiDollarSign} />
        <StatsCard label="Overdue" value={stats.overdue} icon={FiDollarSign} trend="down" />
        <StatsCard
          label="Outstanding"
          value={`€${Math.round(stats.dueTotal).toLocaleString()}`}
          icon={FiDollarSign}
        />
        <StatsCard
          label={`Paid ${periodFilter}`}
          value={`€${Math.round(stats.paidThisPeriod).toLocaleString()}`}
          icon={FiDollarSign}
          trend="up"
        />
      </div>

      <Card className="!p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Generate monthly charges</h2>
        <p className="text-sm text-gray-500">
          Creates one charge per reserved/active allocation for the period. Reruns skip existing
          allocation+period rows (idempotent). Mid-month starts without a proration rule are flagged
          for review — not auto-prorated.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Year"
            type="number"
            className="!w-28"
            value={genYear}
            onChange={(e) => setGenYear(e.target.value)}
          />
          <Input
            label="Month"
            type="number"
            min={1}
            max={12}
            className="!w-24"
            value={genMonth}
            onChange={(e) => setGenMonth(e.target.value)}
          />
          <Input
            label="Due day"
            type="number"
            min={1}
            max={28}
            className="!w-24"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
          <Button loading={busy} onClick={runGenerate}>
            Generate
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Select
          label="Period"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          options={periodOptions}
          placeholder="All periods"
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTS}
          placeholder="All statuses"
        />
        <Select
          label="Property"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="All properties"
        />
        <Input
          label="Search tenant"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiDollarSign}
            title="No rent charges"
            description="Generate monthly charges for allocated beds, or clear filters."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const due = Number(c.amountDue ?? c.amount) || 0;
            const paid = Number(c.paidAmount) || 0;
            const balance = Math.max(0, Number(c.balance ?? due - paid));
            return (
              <Card key={c.id} className="!p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {c.applicantName || c.applicantEmail || "Tenant"}
                      </h3>
                      <Badge variant={badgeFor(c.status)}>{c.status}</Badge>
                      {c.needsProrationReview && <Badge variant="warning">proration review</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {propertyName(c.propertyId)} · {c.period} · due {c.dueDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Due €{due.toLocaleString()} · Paid €{paid.toLocaleString()} · Balance €
                      {balance.toLocaleString()} {c.currency || "EUR"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!["paid", "waived", "cancelled"].includes(c.status) && (
                      <Button size="sm" onClick={() => openPay(c)}>
                        Record payment
                      </Button>
                    )}
                    {c.needsProrationReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjustModal(c);
                          setAdjustAmount(String(c.amountDue ?? c.amount));
                          setAdjustReason("");
                        }}
                      >
                        Correct amount
                      </Button>
                    )}
                    {!["paid", "waived", "cancelled"].includes(c.status) && (
                      <Button size="sm" variant="ghost" onClick={() => waive(c)}>
                        Waive
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Record payment" size="md">
        {payModal && (
          <form onSubmit={submitPay} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-gray-600">
              {payModal.applicantName} · {payModal.period} · balance €
              {Math.max(
                0,
                Number(
                  payModal.balance ??
                    (payModal.amountDue ?? payModal.amount) - (payModal.paidAmount || 0)
                )
              ).toLocaleString()}
            </p>
            <Input
              label="Amount (€)"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
            />
            <Select
              label="Method"
              value={payForm.method}
              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
              options={[
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "cash", label: "Cash" },
                { value: "other", label: "Other" },
              ]}
            />
            <Input
              label="Reference"
              value={payForm.reference}
              onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
              hint="Bank reference only — never store full card numbers"
            />
            <Input
              label="Payment date"
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm((p) => ({ ...p, paymentDate: e.target.value }))}
            />
            <Textarea
              label="Notes"
              rows={2}
              value={payForm.notes}
              onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
            />
            {payments.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium text-gray-700">Prior payments</p>
                <ul className="mt-1 space-y-1 text-gray-600">
                  {payments.map((p) => (
                    <li key={p.id}>
                      €{Number(p.amount).toLocaleString()} · {p.method} · {p.paymentDate || "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPayModal(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        title="Correct charge amount"
        size="md"
      >
        <form onSubmit={submitAdjust} className="space-y-4">
          <Input
            label="New amount due (€)"
            type="number"
            min={0}
            step="0.01"
            required
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <Textarea
            label="Reason"
            required
            rows={2}
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAdjustModal(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
