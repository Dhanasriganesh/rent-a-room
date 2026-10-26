import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  ButtonLink,
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
  FiHome,
} from "react-icons/fi";
import { getRenterHousingSummary } from "../../lib/firestore";
import { PAYMENT_STATUSES, getStatusConfig, formatDate, formatCurrency } from "../../lib/constants";

export default function RenterRent() {
  const { user, userProfile } = useAuth();
  const [housing, setHousing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const data = await getRenterHousingSummary(
          user.uid,
          userProfile?.email || user.email
        );
        if (!cancelled) setHousing(data);
      } catch (error) {
        console.error("Error fetching rent data:", error);
        if (!cancelled) setHousing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, userProfile?.email, user?.email]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!housing?.allocation) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rent & Payments" subtitle="View and manage your rent payments" />
        <Card>
          <EmptyState
            icon={FiDollarSign}
            title="No allocation yet"
            description="Rent and deposit appear here after a manager allocates a room to you."
            action={
              <ButtonLink to="/my-home/tenancy" className="gap-2">
                <FiHome className="h-4 w-4" />
                My Tenancy
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }

  const { allocation, charges } = housing;
  const currency = allocation.currency || "EUR";
  const monthlyRent = Number(allocation.agreedMonthlyRent) || 0;
  const deposit = Number(allocation.agreedDeposit) || 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthCharge = charges.find((c) => {
    const dueDate = c.dueDate?.toDate ? c.dueDate.toDate() : new Date(c.dueDate);
    if (Number.isNaN(dueDate?.getTime?.())) return false;
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });

  const paidTotal = charges.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
  const overdueCharges = charges.filter((c) => c.status === "overdue");
  const amountOf = (c) => Number(c?.amountDue ?? c?.amount ?? 0);
  const balanceOf = (c) =>
    Number(c?.balance ?? Math.max(0, amountOf(c) - (Number(c?.paidAmount) || 0)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent & Payments"
        subtitle="Agreed rent, deposit, and payment history"
        actions={
          <ButtonLink to="/my-home/tenancy" variant="outline" className="gap-2">
            <FiHome className="h-4 w-4" />
            Room details
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Monthly rent"
          value={formatCurrency(monthlyRent, currency)}
          icon={FiDollarSign}
          trend="neutral"
        />
        <StatsCard
          label="Deposit"
          value={formatCurrency(deposit, currency)}
          icon={FiCreditCard}
          trend="neutral"
        />
        <StatsCard
          label="This month"
          value={
            currentMonthCharge?.status === "paid"
              ? "Paid"
              : formatCurrency(
                  currentMonthCharge ? balanceOf(currentMonthCharge) : monthlyRent,
                  currency
                )
          }
          icon={currentMonthCharge?.status === "paid" ? FiCheckCircle : FiClock}
          trend={currentMonthCharge?.status === "paid" ? "up" : "neutral"}
        />
        <StatsCard
          label="Total paid"
          value={formatCurrency(paidTotal, currency)}
          icon={FiCheckCircle}
          change="Recorded payments"
          trend="up"
        />
      </div>

      {overdueCharges.length > 0 && (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">
              {overdueCharges.length} overdue charge
              {overdueCharges.length === 1 ? "" : "s"} ·{" "}
              {formatCurrency(
                overdueCharges.reduce((sum, c) => sum + balanceOf(c), 0),
                currency
              )}{" "}
              outstanding
            </p>
          </div>
        </Card>
      )}

      {currentMonthCharge && currentMonthCharge.status !== "paid" && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Next payment due</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(balanceOf(currentMonthCharge), currency)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <FiCalendar className="h-4 w-4" />
                Due{" "}
                {formatDate(
                  currentMonthCharge.dueDate?.toDate?.() || currentMonthCharge.dueDate
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment history</h2>
        {charges.length === 0 ? (
          <EmptyState
            icon={FiDollarSign}
            title="No charges generated yet"
            description={`Agreed monthly rent is ${formatCurrency(monthlyRent, currency)}. Charges appear after your manager runs rent generation.`}
          />
        ) : (
          <div className="space-y-4">
            {charges.map((charge) => (
              <RentChargeRow key={charge.id} charge={charge} currency={currency} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Payment reference</h2>
        <p className="text-sm text-gray-600">
          Use reference{" "}
          <span className="font-mono font-medium text-gray-900">
            RENT-{allocation.id?.slice(0, 8).toUpperCase()}
          </span>{" "}
          on bank transfers so your manager can match the payment.
        </p>
      </Card>
    </div>
  );
}

function RentChargeRow({ charge, currency = "EUR" }) {
  const statusConfig = getStatusConfig(PAYMENT_STATUSES, charge.status);
  const dueDate = charge.dueDate?.toDate ? charge.dueDate.toDate() : new Date(charge.dueDate);
  const isPaid = charge.status === "paid";
  const isOverdue = charge.status === "overdue";
  const amount = Number(charge.amountDue ?? charge.amount ?? 0);
  const paidAmount = Number(charge.paidAmount) || 0;

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
          <p className="font-medium text-gray-900">
            {charge.description || `Rent ${charge.period || ""}`.trim()}
          </p>
          <p className="text-sm text-gray-500">
            {isPaid
              ? `Paid ${formatDate(charge.paidAt?.toDate?.() || charge.paidAt)}`
              : `Due ${formatDate(dueDate)}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatCurrency(amount, currency)}</p>
          {paidAmount > 0 && paidAmount < amount && (
            <p className="text-sm text-gray-500">Paid: {formatCurrency(paidAmount, currency)}</p>
          )}
        </div>
        <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
        {isPaid && (
          <Button variant="ghost" size="sm" className="gap-1">
            <FiDownload className="h-4 w-4" />
            Receipt
          </Button>
        )}
      </div>
    </div>
  );
}
