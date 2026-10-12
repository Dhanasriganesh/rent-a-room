import { PageHeader, Card, StatsCard } from "../../components/ui";
import { FiTrendingUp, FiHome, FiDollarSign, FiUsers } from "react-icons/fi";

export default function OwnerAnalytics() {
  return (
    <div>
      <PageHeader title="Analytics" subtitle="View your property performance metrics" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard label="Occupancy Rate" value="87%" icon={FiHome} change="+5% from last month" trend="up" />
        <StatsCard label="Total Revenue" value="€45,200" icon={FiDollarSign} change="+12% YTD" trend="up" />
        <StatsCard label="Active Tenants" value="18" icon={FiUsers} />
        <StatsCard label="Avg. Rent" value="€950" icon={FiTrendingUp} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Chart coming soon...
        </div>
      </Card>
    </div>
  );
}
