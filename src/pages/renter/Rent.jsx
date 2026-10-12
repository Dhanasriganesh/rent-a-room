import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  Spinner,
  StatsCard,
} from "../../components/ui";
import {
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiCalendar,
  FiCreditCard,
  FiDownload,
  FiExternalLink,
} from "react-icons/fi";
import { queryDocuments, getDocument, COLLECTIONS } from "../../lib/firestore";
import { PAYMENT_STATUSES, getStatusConfig, formatDate, formatCurrency } from "../../lib/constants";

export default function RenterRent() {
  const { user } = useAuth();
  const [charges, setCharges] = useState([]);
  const [tenancy, setTenancy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRentData();
  }, [user?.uid]);

  const fetchRentData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Find active tenancy membership
      const memberships = await queryDocuments(
        COLLECTIONS.TENANCY_MEMBERS,
        [
          { field: "tenantUserId", operator: "==", value: user.uid },
          { field: "status", operator: "==", value: "active" },
        ]
      );

      if (memberships.length > 0) {
        const membership = memberships[0];
        const tenancyData = await getDocument(COLLECTIONS.TENANCIES, membership.tenancyId);
        setTenancy(tenancyData);

        // Get rent charges for this tenancy
        const chargesData = await queryDocuments(
          COLLECTIONS.RENT_CHARGES,
          [{ field: "tenancyId", operator: "==", value: membership.tenancyId }],
          { field: "dueDate", direction: "desc" }
        );
        setCharges(chargesData);
      }
    } catch (error) {
      console.error("Error fetching rent data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tenancy) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rent & Payments" subtitle="View and manage your rent payments" />
        <Card>
          <EmptyState
            icon={FiDollarSign}
            title="No active tenancy"
            description="Rent payments will appear here once you have an active tenancy."
          />
        </Card>
      </div>
    );
  }

  // Calculate stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthCharge = charges.find((c) => {
    const dueDate = c.dueDate?.toDate ? c.dueDate.toDate() : new Date(c.dueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const paidTotal = charges.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const overdueCharges = charges.filter((c) => c.status === "overdue");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent & Payments"
        subtitle="View and manage your rent payments"
        actions={
          <Button variant="outline" className="gap-2">
            <FiDownload className="h-4 w-4" />
            Download History
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Monthly Rent"
          value={formatCurrency(tenancy.rentAmount)}
          icon={FiDollarSign}
          trend="neutral"
        />
        <StatsCard
          label="This Month"
          value={currentMonthCharge?.status === "paid" ? "Paid" : formatCurrency(currentMonthCharge?.amount || tenancy.rentAmount)}
          icon={currentMonthCharge?.status === "paid" ? FiCheckCircle : FiClock}
          trend={currentMonthCharge?.status === "paid" ? "up" : "neutral"}
        />
        <StatsCard
          label="Total Paid"
          value={formatCurrency(paidTotal)}
          icon={FiCheckCircle}
          change="All time"
          trend="up"
        />
        {overdueCharges.length > 0 && (
          <StatsCard
            label="Overdue"
            value={formatCurrency(overdueCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0))}
            icon={FiAlertCircle}
            trend="down"
          />
        )}
      </div>

      {/* Current/Next Payment */}
      {currentMonthCharge && currentMonthCharge.status !== "paid" && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Next Payment Due</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(currentMonthCharge.amount - (currentMonthCharge.paidAmount || 0))}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <FiCalendar className="h-4 w-4" />
                Due {formatDate(currentMonthCharge.dueDate?.toDate?.() || currentMonthCharge.dueDate)}
              </p>
            </div>
            <Button size="lg" className="gap-2">
              <FiCreditCard className="h-5 w-5" />
              Pay Now
            </Button>
          </div>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment History</h2>
        {charges.length === 0 ? (
          <EmptyState
            icon={FiDollarSign}
            title="No payments yet"
            description="Your rent payment history will appear here."
          />
        ) : (
          <div className="space-y-4">
            {charges.map((charge) => (
              <RentChargeRow key={charge.id} charge={charge} />
            ))}
          </div>
        )}
      </Card>

      {/* Payment Methods Info */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Information</h2>
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Bank Account (IBAN)</p>
              <p className="mt-1 font-mono font-medium text-gray-900">DE89 3704 0044 0532 0130 00</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">BIC/SWIFT</p>
              <p className="mt-1 font-mono font-medium text-gray-900">COBADEFFXXX</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Account Holder</p>
              <p className="mt-1 font-medium text-gray-900">Property Management GmbH</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Reference</p>
              <p className="mt-1 font-mono font-medium text-gray-900">RENT-{tenancy.id?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Please include the payment reference in your bank transfer to ensure your payment is processed correctly.
          </p>
        </div>
      </Card>
    </div>
  );
}

function RentChargeRow({ charge }) {
  const statusConfig = getStatusConfig(PAYMENT_STATUSES, charge.status);
  const dueDate = charge.dueDate?.toDate ? charge.dueDate.toDate() : new Date(charge.dueDate);
  const isPaid = charge.status === "paid";
  const isOverdue = charge.status === "overdue";

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
        isOverdue ? "border-red-200 bg-red-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isPaid ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-gray-100"
          }`}
        >
          {isPaid ? (
            <FiCheckCircle className="h-5 w-5 text-green-600" />
          ) : isOverdue ? (
            <FiAlertCircle className="h-5 w-5 text-red-600" />
          ) : (
            <FiClock className="h-5 w-5 text-gray-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{charge.description || "Monthly Rent"}</p>
          <p className="text-sm text-gray-500">
            {isPaid
              ? `Paid ${formatDate(charge.paidAt?.toDate?.() || charge.paidAt)}`
              : `Due ${formatDate(dueDate)}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatCurrency(charge.amount)}</p>
          {charge.paidAmount > 0 && charge.paidAmount < charge.amount && (
            <p className="text-sm text-gray-500">
              Paid: {formatCurrency(charge.paidAmount)}
            </p>
          )}
        </div>
        <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
        {isPaid && (
          <Button variant="ghost" size="sm" className="gap-1">
            <FiDownload className="h-4 w-4" />
            Receipt
          </Button>
        )}
        {!isPaid && (
          <Button size="sm" className="gap-1">
            <FiCreditCard className="h-4 w-4" />
            Pay
          </Button>
        )}
      </div>
    </div>
  );
}
