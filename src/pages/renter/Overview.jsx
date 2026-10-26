import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  StatsCard,
  Badge,
  ButtonLink,
  Spinner,
  EmptyState,
} from "../../components/ui";
import {
  FiHome,
  FiHeart,
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiArrowRight,
  FiTool,
  FiMessageSquare,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import { queryDocuments, getDocument, getRenterHousingSummary, COLLECTIONS } from "../../lib/firestore";
import {
  APPLICATION_STATUSES,
  ALLOCATION_STATUSES,
  PAYMENT_STATUSES,
  REQUEST_STATUSES,
  getStatusConfig,
  formatDate,
  formatCurrency,
  formatRelativeDate,
} from "../../lib/constants";

export default function RenterOverview() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [housing, setHousing] = useState(null);
  const [applications, setApplications] = useState([]);
  const [rentCharges, setRentCharges] = useState([]);
  const [requests, setRequests] = useState([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.uid, userProfile?.email, user?.email]);

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [appsData, housingData, requestsData, renterProfile] = await Promise.all([
        queryDocuments(
          COLLECTIONS.APPLICATIONS,
          [{ field: "renterId", operator: "==", value: user.uid }],
          { field: "submittedAt", direction: "desc" },
          10
        ),
        getRenterHousingSummary(user.uid, userProfile?.email || user.email),
        queryDocuments(
          COLLECTIONS.REQUESTS,
          [{ field: "tenantUserId", operator: "==", value: user.uid }],
          { field: "createdAt", direction: "desc" },
          10
        ),
        getDocument(COLLECTIONS.RENTER_PROFILES, user.uid),
      ]);

      setApplications(appsData.slice(0, 5));
      setHousing(housingData);
      setRentCharges((housingData?.charges || []).slice(0, 3));
      setRequests(
        (requestsData || [])
          .filter((r) => !["resolved", "closed"].includes(r.status))
          .slice(0, 3)
      );
      setSavedCount(renterProfile?.savedListings?.length || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  const activeApplications = applications.filter((a) => !["withdrawn", "rejected", "accepted"].includes(a.status));
  const nextRent = rentCharges.find((c) => c.status !== "paid");
  const openRequests = requests.length;
  const allocation = housing?.allocation;
  const allocStatus = allocation
    ? getStatusConfig(ALLOCATION_STATUSES, allocation.status)
    : null;
  const currency = allocation?.currency || "EUR";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userProfile?.displayName?.split(" ")[0] || "Renter"}!
        </h1>
        <p className="mt-1 text-gray-500">Here's an overview of your rental journey.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Saved Homes"
          value={savedCount}
          icon={FiHeart}
          trend="neutral"
        />
        <StatsCard
          label="Applications"
          value={activeApplications.length}
          icon={FiFileText}
          change={`${applications.length} total`}
          trend="neutral"
        />
        {nextRent ? (
          <StatsCard
            label="Next Rent Due"
            value={formatCurrency(
              Number(nextRent.balance ?? nextRent.amountDue ?? nextRent.amount ?? 0) -
                (nextRent.balance != null ? 0 : Number(nextRent.paidAmount) || 0),
              currency
            )}
            icon={FiDollarSign}
            change={`Due ${formatDate(nextRent.dueDate?.toDate?.() || nextRent.dueDate)}`}
            trend={nextRent.status === "overdue" ? "down" : "neutral"}
          />
        ) : allocation ? (
          <StatsCard
            label="Monthly rent"
            value={formatCurrency(allocation.agreedMonthlyRent || 0, currency)}
            icon={FiDollarSign}
            change={`Deposit ${formatCurrency(allocation.agreedDeposit || 0, currency)}`}
            trend="neutral"
          />
        ) : (
          <StatsCard
            label="Rent Status"
            value="—"
            icon={FiCheckCircle}
            trend="neutral"
          />
        )}
        <StatsCard
          label="Open Requests"
          value={openRequests}
          icon={FiTool}
          trend="neutral"
        />
      </div>

      {/* Allocated room (mediation) or find-home CTA */}
      {allocation ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My allocated room</h2>
            <Link to="/my-home/tenancy" className="text-sm text-primary hover:text-primary-dark">
              View details
            </Link>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <FiHome className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {housing.property?.name || "Your property"}
                </p>
                <p className="text-sm text-gray-500">
                  {[housing.room?.name || housing.room?.label, housing.bed?.label || housing.bed?.name]
                    .filter(Boolean)
                    .join(" · ") || "Room reserved"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(allocation.agreedMonthlyRent || 0, currency)}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gray-500">
                Deposit {formatCurrency(allocation.agreedDeposit || 0, currency)}
                {allocation.startDate ? ` · start ${formatDate(allocation.startDate)}` : ""}
              </span>
              <Badge variant={allocStatus?.color || "warning"}>
                {allocStatus?.label || allocation.status}
              </Badge>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex flex-col items-center py-4 text-center">
            <FiSearch className="h-12 w-12 text-primary" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Find Your Perfect Home</h2>
            <p className="mt-2 max-w-md text-gray-500">
              Browse verified listings, apply online, and manage your entire rental journey in one place.
            </p>
            <ButtonLink to="/my-home/discover" className="mt-4 gap-2">
              <FiSearch className="h-4 w-4" />
              Browse Listings
            </ButtonLink>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Payments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Payments</h2>
            <Link to="/my-home/rent" className="text-sm text-primary hover:text-primary-dark">
              View all
            </Link>
          </div>
          {rentCharges.length === 0 ? (
            <EmptyState
              icon={FiDollarSign}
              title="No payments due"
              description="Your payment history will appear here."
            />
          ) : (
            <div className="space-y-3">
              {rentCharges.map((charge) => {
                const statusConfig = getStatusConfig(PAYMENT_STATUSES, charge.status);
                return (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          charge.status === "paid"
                            ? "bg-green-100"
                            : charge.status === "overdue"
                            ? "bg-red-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {charge.status === "paid" ? (
                          <FiCheckCircle className="h-5 w-5 text-green-600" />
                        ) : charge.status === "overdue" ? (
                          <FiAlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <FiCalendar className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{charge.description || "Monthly Rent"}</p>
                        <p className="text-sm text-gray-500">
                          Due {formatDate(charge.dueDate?.toDate?.() || charge.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(charge.amount)}</p>
                      <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Applications */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <Link to="/my-home/applications" className="text-sm text-primary hover:text-primary-dark">
              View all
            </Link>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              icon={FiFileText}
              title="No applications yet"
              description="Apply to listings to track them here."
              action={
                <ButtonLink to="/my-home/discover" className="gap-2">
                  <FiSearch className="h-4 w-4" />
                  Browse Listings
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 3).map((app) => {
                const statusConfig = getStatusConfig(APPLICATION_STATUSES, app.status);
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{app.listingTitle}</p>
                      <p className="text-sm text-gray-500">
                        Applied {formatRelativeDate(app.submittedAt?.toDate?.() || app.submittedAt)}
                      </p>
                    </div>
                    <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Open Maintenance Requests */}
      {requests.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Open Maintenance Requests</h2>
            <Link to="/my-home/requests" className="text-sm text-primary hover:text-primary-dark">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <FiTool className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{request.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeDate(request.createdAt?.toDate?.() || request.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusConfig(REQUEST_STATUSES, request.status).color}>
                  {getStatusConfig(REQUEST_STATUSES, request.status).label}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
