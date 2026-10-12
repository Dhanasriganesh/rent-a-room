import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  StatsCard,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
  Avatar,
} from "../../components/ui";
import {
  FiDollarSign,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiFilter,
  FiPlus,
  FiDownload,
  FiCalendar,
  FiHome,
  FiUser,
} from "react-icons/fi";
import {
  getRentChargesByOwner,
  recordPayment,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  PAYMENT_STATUSES,
  getStatusConfig,
  formatDate,
  formatCurrency,
} from "../../lib/constants";

export default function OwnerRent() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("filter") || "");
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "bank_transfer",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetchCharges();
  }, [user?.uid]);

  const fetchCharges = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getRentChargesByOwner(user.uid);
      // Fetch tenancy and unit details
      const chargesWithDetails = await Promise.all(
        data.map(async (charge) => {
          const [tenancy, unit] = await Promise.all([
            getDocument(COLLECTIONS.TENANCIES, charge.tenancyId),
            getDocument(COLLECTIONS.UNITS, charge.unitId),
          ]);
          return { ...charge, tenancy, unit };
        })
      );
      setCharges(chargesWithDetails);
    } catch (error) {
      console.error("Error fetching charges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCharge) return;
    setProcessing(true);
    try {
      await recordPayment(selectedCharge.id, {
        payerId: selectedCharge.responsibleTenantId || null,
        amount: parseFloat(paymentData.amount) || selectedCharge.amount - selectedCharge.paidAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        notes: paymentData.notes,
        isManual: true,
      });
      await fetchCharges();
      setShowPaymentModal(false);
      setSelectedCharge(null);
      setPaymentData({
        amount: "",
        method: "bank_transfer",
        reference: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error recording payment:", error);
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentModal = (charge) => {
    setSelectedCharge(charge);
    setPaymentData({
      amount: String(charge.amount - charge.paidAmount),
      method: "bank_transfer",
      reference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const filteredCharges = charges.filter((charge) => {
    if (!statusFilter) return true;
    return charge.status === statusFilter;
  });

  // Calculate stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthCharges = charges.filter((c) => {
    const dueDate = c.dueDate?.toDate ? c.dueDate.toDate() : new Date(c.dueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const expectedThisMonth = currentMonthCharges.reduce((sum, c) => sum + c.amount, 0);
  const collectedThisMonth = currentMonthCharges.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const pendingAmount = charges
    .filter((c) => c.status === "due" || c.status === "upcoming")
    .reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);
  const overdueAmount = charges
    .filter((c) => c.status === "overdue")
    .reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);

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
        title="Rent & Payments"
        subtitle="Track rent collection and manage payment records"
        actions={
          <Button variant="outline" className="gap-2">
            <FiDownload className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Expected This Month"
          value={formatCurrency(expectedThisMonth)}
          icon={FiCalendar}
          trend="neutral"
        />
        <StatsCard
          label="Collected"
          value={formatCurrency(collectedThisMonth)}
          icon={FiCheckCircle}
          change={expectedThisMonth > 0 ? `${Math.round((collectedThisMonth / expectedThisMonth) * 100)}%` : "0%"}
          trend="up"
        />
        <StatsCard
          label="Pending"
          value={formatCurrency(pendingAmount)}
          icon={FiClock}
          trend="neutral"
        />
        <StatsCard
          label="Overdue"
          value={formatCurrency(overdueAmount)}
          icon={FiAlertCircle}
          trend={overdueAmount > 0 ? "down" : "neutral"}
        />
      </div>

      {charges.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiDollarSign}
            title="No rent charges yet"
            description="Rent charges will appear here when you have active tenancies. Create a tenancy to start tracking rent."
          />
        </Card>
      ) : (
        <>
          {/* Filter */}
          <div className="flex items-center gap-4">
            <Select
              options={[
                { value: "", label: "All Statuses" },
                ...PAYMENT_STATUSES,
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-48"
            />
            <p className="text-sm text-gray-500">
              Showing {filteredCharges.length} of {charges.length} charges
            </p>
          </div>

          {/* Charges List */}
          <div className="space-y-4">
            {filteredCharges.map((charge) => (
              <RentChargeCard
                key={charge.id}
                charge={charge}
                onRecordPayment={() => openPaymentModal(charge)}
              />
            ))}
          </div>
        </>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCharge(null);
        }}
        title="Record Payment"
        size="md"
      >
        {selectedCharge && (
          <div className="space-y-6">
            {/* Charge Info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{selectedCharge.description}</p>
                  <p className="font-medium text-gray-900">
                    {selectedCharge.unit?.unitName || "Unknown Unit"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedCharge.amount - selectedCharge.paidAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <Input
                label="Amount (€)"
                type="number"
                min="0"
                max={selectedCharge.amount - selectedCharge.paidAmount}
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                required
              />
              <Select
                label="Payment Method"
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "paypal", label: "PayPal" },
                  { value: "other", label: "Other" },
                ]}
                value={paymentData.method}
                onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
              />
              <Input
                label="Reference Number (optional)"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="e.g., Bank transaction ID"
              />
              <Textarea
                label="Notes (optional)"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedCharge(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} loading={processing}>
                Record Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RentChargeCard({ charge, onRecordPayment }) {
  const statusConfig = getStatusConfig(PAYMENT_STATUSES, charge.status);
  const dueDate = charge.dueDate?.toDate ? charge.dueDate.toDate() : new Date(charge.dueDate);
  const isOverdue = charge.status === "overdue";
  const isPaid = charge.status === "paid";

  return (
    <Card className={`${isOverdue ? "border-l-4 border-l-red-500" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Unit & Period */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
              isPaid
                ? "bg-green-100"
                : isOverdue
                ? "bg-red-100"
                : "bg-gray-100"
            }`}
          >
            {isPaid ? (
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            ) : isOverdue ? (
              <FiAlertCircle className="h-6 w-6 text-red-600" />
            ) : (
              <FiDollarSign className="h-6 w-6 text-gray-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {charge.unit?.unitName || "Unknown Unit"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{charge.description}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
              <FiCalendar className="h-4 w-4" />
              Due {formatDate(dueDate)}
            </p>
          </div>
        </div>

        {/* Amount & Status */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(charge.amount)}
            </p>
            {charge.paidAmount > 0 && charge.paidAmount < charge.amount && (
              <p className="text-sm text-gray-500">
                Paid: {formatCurrency(charge.paidAmount)}
              </p>
            )}
          </div>
          <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
          {!isPaid && (
            <Button size="sm" onClick={onRecordPayment} className="gap-1">
              <FiPlus className="h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar for partial payments */}
      {charge.paidAmount > 0 && charge.paidAmount < charge.amount && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment Progress</span>
            <span className="font-medium text-gray-900">
              {Math.round((charge.paidAmount / charge.amount) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(charge.paidAmount / charge.amount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
