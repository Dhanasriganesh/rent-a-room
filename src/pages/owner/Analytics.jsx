import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getOwnerStats,
  getRentChargesByOwner,
  getPropertiesByOwner,
  getRequestsByOwner,
} from "../../lib/firestore";
import { formatCurrency, formatDate } from "../../lib/constants";
import {
  PageHeader,
  Card,
  StatsCard,
  Spinner,
  EmptyState,
  StatusBadge,
} from "../../components/ui";
import {
  FiTrendingUp,
  FiHome,
  FiDollarSign,
  FiUsers,
  FiAlertCircle,
  FiTool,
} from "react-icons/fi";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function OwnerAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [charges, setCharges] = useState([]);
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [s, c, p, r] = await Promise.all([
          getOwnerStats(user.uid),
          getRentChargesByOwner(user.uid),
          getPropertiesByOwner(user.uid),
          getRequestsByOwner(user.uid),
        ]);
        if (cancelled) return;
        setStats(s);
        setCharges(c);
        setProperties(p);
        setRequests(r);
        setUpdatedAt(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = stats || {};
  const byMonth = {};
  charges.forEach((c) => {
    const d = toDate(c.dueDate);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { expected: 0, collected: 0 };
    byMonth[key].expected += c.amount || 0;
    byMonth[key].collected += c.paidAmount || 0;
  });
  const monthRows = Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 6);

  const openRequests = requests.filter((r) => !["resolved", "closed"].includes(r.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Verified charges & payments only · Updated ${
          updatedAt ? updatedAt.toLocaleString() : "—"
        }`}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatsCard
          label="Occupancy rate"
          value={`${s.occupancyRate || 0}%`}
          icon={FiHome}
          change={`${s.occupiedUnits || 0}/${s.totalUnits || 0} units`}
        />
        <StatsCard
          label="Rent expected (month)"
          value={formatCurrency(s.expectedRent || 0)}
          icon={FiDollarSign}
        />
        <StatsCard
          label="Rent collected (month)"
          value={formatCurrency(s.collectedRent || 0)}
          icon={FiTrendingUp}
          change={`${s.collectionRate || 0}% collection rate`}
          trend={s.collectionRate >= 80 ? "up" : "down"}
        />
        <StatsCard
          label="Active tenancies"
          value={String(s.activeTenancies || 0)}
          icon={FiUsers}
          change={
            s.overdueAmount
              ? `Overdue ${formatCurrency(s.overdueAmount)}`
              : `${openRequests.length} open requests`
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Rent by month</h2>
          {monthRows.length === 0 ? (
            <EmptyState
              icon={FiDollarSign}
              title="No rent charges yet"
              description="Activate tenancies to generate the rent ledger."
            />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Month</th>
                  <th className="py-2 font-medium">Expected</th>
                  <th className="py-2 font-medium">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthRows.map(([month, row]) => (
                  <tr key={month}>
                    <td className="py-2">{month}</td>
                    <td className="py-2">{formatCurrency(row.expected)}</td>
                    <td className="py-2 font-medium text-primary">
                      {formatCurrency(row.collected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Property occupancy</h2>
          {properties.length === 0 ? (
            <EmptyState icon={FiHome} title="No properties" description="Add properties to see occupancy." />
          ) : (
            <div className="space-y-3">
              {properties.map((p) => {
                const rate =
                  p.totalUnits > 0
                    ? Math.round(((p.occupiedUnits || 0) / p.totalUnits) * 100)
                    : 0;
                return (
                  <div key={p.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{p.name}</span>
                      <span className="text-gray-500">
                        {p.occupiedUnits || 0}/{p.totalUnits || 0} · {rate}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FiTool className="h-5 w-5" />
          Open requests
        </h2>
        {openRequests.length === 0 ? (
          <p className="text-sm text-gray-500">No open maintenance requests.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {openRequests.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{r.title}</p>
                  <p className="text-sm text-gray-500">
                    {r.category} · {formatDate(toDate(r.createdAt))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(r.priority === "high" || r.priority === "urgent") && (
                    <FiAlertCircle className="text-red-500" />
                  )}
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
