import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getOwnerStats,
  getApplicationsByOwner,
  getOpenRequestsByOwner,
  getRentChargesByOwner,
} from "../../lib/firestore";
import { formatCurrency, formatRelativeDate, getStatusConfig, REQUEST_PRIORITIES } from "../../lib/constants";
import { Card, StatsCard, Badge, ButtonLink, Spinner, EmptyState, StatusBadge } from "../../components/ui";
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
  FiArrowRight,
  FiPlus,
  FiTool,
} from "react-icons/fi";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function OwnerOverview() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [upcomingCharges, setUpcomingCharges] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const [ownerStats, apps, openRequests, charges] = await Promise.all([
          getOwnerStats(user.uid),
          getApplicationsByOwner(user.uid),
          getOpenRequestsByOwner(user.uid),
          getRentChargesByOwner(user.uid),
        ]);

        if (cancelled) return;

        const upcoming = charges
          .filter((c) => ["upcoming", "due", "overdue", "partial"].includes(c.status))
          .map((c) => ({ ...c, _due: toDate(c.dueDate) }))
          .filter((c) => c._due)
          .sort((a, b) => a._due - b._due)
          .slice(0, 5);

        setStats(ownerStats);
        setApplications(apps.slice(0, 5));
        setRequests(openRequests.slice(0, 5));
        setUpcomingCharges(upcoming);
      } catch (err) {
        console.error("Failed to load owner overview:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = stats || {
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    occupancyRate: 0,
    activeTenancies: 0,
    publishedListings: 0,
    expectedRent: 0,
    collectedRent: 0,
    collectionRate: 0,
    overdueAmount: 0,
    openRequests: 0,
    highPriorityRequests: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {userProfile?.displayName?.split(" ")[0] || "Owner"}!
          </h1>
          <p className="mt-1 text-gray-500">
            Portfolio snapshot from verified Firestore records.
          </p>
        </div>
        <ButtonLink to="/dashboard/listings/new" className="gap-2">
          <FiPlus className="h-4 w-4" />
          Add New Listing
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatsCard
          label="Properties"
          value={String(s.totalProperties)}
          icon={FiHome}
          change={`${s.totalUnits} units · ${s.publishedListings} published`}
        />
        <StatsCard
          label="Occupancy"
          value={`${s.occupancyRate}%`}
          icon={FiTrendingUp}
          change={`${s.occupiedUnits} occupied · ${s.vacantUnits} vacant`}
          trend={s.occupancyRate >= 70 ? "up" : "down"}
        />
        <StatsCard
          label="Rent this month"
          value={formatCurrency(s.collectedRent)}
          icon={FiDollarSign}
          change={`${formatCurrency(s.expectedRent)} expected · ${s.collectionRate}% collected`}
        />
        <StatsCard
          label="Open requests"
          value={String(s.openRequests)}
          icon={FiAlertCircle}
          change={
            s.highPriorityRequests
              ? `${s.highPriorityRequests} high priority`
              : `${s.activeTenancies} active tenancies`
          }
          trend={s.highPriorityRequests ? "down" : undefined}
        />
      </div>

      {s.overdueAmount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-red-800">
                Overdue rent: {formatCurrency(s.overdueAmount)}
              </p>
              <p className="text-sm text-red-700">
                Based on charge balances after due date — not unconfirmed payment clicks.
              </p>
            </div>
            <ButtonLink to="/dashboard/rent" variant="danger" size="sm">
              Review rent
            </ButtonLink>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent applications</h2>
            <Link to="/dashboard/applications" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {applications.length === 0 ? (
            <EmptyState
              icon={FiUsers}
              title="No applications yet"
              description="When renters apply to your listings, they will show up here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {app.listingTitle || "Listing application"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatRelativeDate(toDate(app.submittedAt || app.createdAt))}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Requests needing attention</h2>
            <Link to="/dashboard/requests" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {requests.length === 0 ? (
            <EmptyState
              icon={FiTool}
              title="No open requests"
              description="Maintenance and service tickets from tenants will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((req) => {
                const priority = getStatusConfig(REQUEST_PRIORITIES, req.priority);
                return (
                  <div key={req.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{req.title}</p>
                      <p className="text-sm text-gray-500">
                        {req.category} · {formatRelativeDate(toDate(req.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priority.color || "default"}>{priority.label}</Badge>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming / open rent charges</h2>
          <Link
            to="/dashboard/rent"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Rent dashboard <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {upcomingCharges.length === 0 ? (
          <EmptyState
            icon={FiDollarSign}
            title="No open charges"
            description="Create tenancies and rent charges to track collections here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Due</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingCharges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-2 py-3 text-gray-900">
                      {charge.description || "Rent charge"}
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {charge._due?.toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-2 py-3 font-medium text-gray-900">
                      {formatCurrency(charge.amount, charge.currency)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={charge.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
