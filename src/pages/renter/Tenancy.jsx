import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  ButtonLink,
  Spinner,
} from "../../components/ui";
import {
  FiHome,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiFileText,
  FiClock,
  FiKey,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { getRenterHousingSummary } from "../../lib/firestore";
import {
  ALLOCATION_STATUSES,
  getStatusConfig,
  formatDate,
  formatCurrency,
} from "../../lib/constants";

export default function RenterTenancy() {
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
        console.error("Error fetching housing:", error);
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
        <PageHeader title="My Tenancy" subtitle="Your room allocation and rent terms" />
        <Card>
          <EmptyState
            icon={FiHome}
            title="No room allocated yet"
            description="When a manager reserves a bed for you, the room, monthly rent, and deposit appear here."
            action={
              <ButtonLink to="/my-home/applications" className="gap-2">
                <FiFileText className="h-4 w-4" />
                View Applications
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }

  const { allocation, property, room, bed, charges } = housing;
  const statusConfig = getStatusConfig(ALLOCATION_STATUSES, allocation.status);
  const currency = allocation.currency || "EUR";
  const startDate = allocation.startDate
    ? new Date(allocation.startDate)
    : null;

  const openCharges = charges.filter((c) =>
    ["due", "partial", "overdue", "pending"].includes(c.status)
  );
  const paidCharges = charges.filter((c) => c.status === "paid");
  const latestOpen = openCharges[0] || null;
  const latestPaid = paidCharges[0] || null;

  const roomLabel =
    room?.name || room?.label || room?.roomNumber
      ? `Room ${room?.name || room?.label || room?.roomNumber}`
      : "Your room";
  const bedLabel =
    bed?.label || bed?.bedNumber || bed?.name
      ? `Bed ${bed?.label || bed?.bedNumber || bed?.name}`
      : "Assigned bed";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tenancy"
        subtitle="Your allocated room, rent, and deposit"
        actions={
          <ButtonLink to="/my-home/rent" variant="outline" size="sm">
            Rent & payments
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FiHome className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {property?.name || "Allocated property"}
              </h2>
              {(property?.address || property?.city) && (
                <p className="mt-1 flex items-center gap-1 text-gray-500">
                  <FiMapPin className="h-4 w-4" />
                  {[property?.address, property?.city].filter(Boolean).join(", ")}
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-gray-700">
                {roomLabel} · {bedLabel}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                {allocation.status === "reserved" && (
                  <span className="text-sm text-amber-700">
                    Reserved — move-in not completed yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <Card className="text-center">
          <FiDollarSign className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(allocation.agreedMonthlyRent || 0, currency)}
          </p>
          <p className="text-sm text-gray-500">Monthly rent</p>
        </Card>
        <Card className="text-center">
          <FiKey className="mx-auto h-7 w-7 text-blue-600" />
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(allocation.agreedDeposit || 0, currency)}
          </p>
          <p className="text-sm text-gray-500">Deposit</p>
        </Card>
        <Card className="text-center">
          <FiCalendar className="mx-auto h-7 w-7 text-green-600" />
          <p className="mt-2 text-lg font-bold text-gray-900">
            {startDate ? formatDate(startDate) : "—"}
          </p>
          <p className="text-sm text-gray-500">Start date</p>
        </Card>
        <Card className="text-center">
          <FiClock className="mx-auto h-7 w-7 text-amber-600" />
          <p className="mt-2 text-lg font-bold text-gray-900">
            {allocation.plannedEndDate
              ? formatDate(new Date(allocation.plannedEndDate))
              : "Open-ended"}
          </p>
          <p className="text-sm text-gray-500">Planned end</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">This month</h3>
          {latestOpen ? (
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatCurrency(latestOpen.balance ?? latestOpen.amountDue ?? latestOpen.amount, currency)}{" "}
                  {latestOpen.status === "overdue" ? "overdue" : "due"}
                </p>
                <p className="text-sm text-gray-500">
                  Period {latestOpen.period || "—"}
                  {latestOpen.dueDate
                    ? ` · due ${formatDate(
                        latestOpen.dueDate?.toDate
                          ? latestOpen.dueDate.toDate()
                          : new Date(latestOpen.dueDate)
                      )}`
                    : ""}
                </p>
                <ButtonLink to="/my-home/rent" className="mt-3" size="sm">
                  View payments
                </ButtonLink>
              </div>
            </div>
          ) : latestPaid ? (
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Rent paid for {latestPaid.period || "latest period"}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(latestPaid.paidAmount || latestPaid.amountDue || 0, currency)} recorded
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No rent charges yet. Your manager generates monthly rent from the allocation; agreed rent is{" "}
              <strong>{formatCurrency(allocation.agreedMonthlyRent || 0, currency)}</strong>/month.
            </p>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Allocation details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Property</dt>
              <dd className="font-medium text-gray-900 text-right">{property?.name || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Room</dt>
              <dd className="font-medium text-gray-900 text-right">{roomLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Bed</dt>
              <dd className="font-medium text-gray-900 text-right">{bedLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900 text-right">{statusConfig.label}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
