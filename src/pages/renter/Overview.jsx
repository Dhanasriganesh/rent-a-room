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
import { queryDocuments, getDocument, COLLECTIONS } from "../../lib/firestore";
import {
  APPLICATION_STATUSES,
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
  const [tenancy, setTenancy] = useState(null);
  const [unit, setUnit] = useState(null);
  const [applications, setApplications] = useState([]);
  const [rentCharges, setRentCharges] = useState([]);
  const [requests, setRequests] = useState([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.uid]);

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Fetch applications
      const appsData = await queryDocuments(
        COLLECTIONS.APPLICATIONS,
        [{ field: "renterId", operator: "==", value: user.uid }],
        { field: "submittedAt", direction: "desc" }
      );
      setApplications(appsData.slice(0, 5));

      // Fetch tenancy membership
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

        if (tenancyData) {
          // Fetch unit
          const unitData = await getDocument(COLLECTIONS.UNITS, tenancyData.unitId);
          setUnit(unitData);

          // Fetch rent charges
          const chargesData = await queryDocuments(
            COLLECTIONS.RENT_CHARGES,
            [{ field: "tenancyId", operator: "==", value: membership.tenancyId }],
            { field: "dueDate", direction: "desc" }
          );
          setRentCharges(chargesData.slice(0, 3));

          // Fetch maintenance requests
          const requestsData = await queryDocuments(
            COLLECTIONS.REQUESTS,
            [{ field: "tenancyId", operator: "==", value: membership.tenancyId }],
            { field: "createdAt", direction: "desc" }
          );
          setRequests(requestsData.filter((r) => !["resolved", "closed"].includes(r.status)).slice(0, 3));
        }
      }

      // Get saved listings count from profile
      const renterProfile = await getDocument(COLLECTIONS.RENTER_PROFILES, user.uid);
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
            value={formatCurrency(nextRent.amount - (nextRent.paidAmount || 0))}
            icon={FiDollarSign}
            change={`Due ${formatDate(nextRent.dueDate?.toDate?.() || nextRent.dueDate)}`}
            trend={nextRent.status === "overdue" ? "down" : "neutral"}
          />
        ) : (
          <StatsCard
            label="Rent Status"
            value="All Paid"
            icon={FiCheckCircle}
            trend="up"
          />
        )}
        <StatsCard
          label="Open Requests"
          value={openRequests}
          icon={FiTool}
          trend="neutral"
        />
      </div>

      {/* My Tenancy or Find Home CTA */}
      {tenancy && unit ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Tenancy</h2>
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
                <p className="font-semibold text-gray-900">{unit.unitName}</p>
                <p className="text-sm text-gray-500">
                  {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sqm} m²
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{formatCurrency(tenancy.rentAmount)}</p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Since {formatDate(tenancy.startDate?.toDate?.() || tenancy.startDate)}
              </span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex flex-col items-center text-center py-4">
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
