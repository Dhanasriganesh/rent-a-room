import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, StatsCard, Badge, Button, ButtonLink, Spinner } from "../../components/ui";
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
  FiArrowRight,
  FiPlus,
  FiMapPin,
  FiCalendar,
} from "react-icons/fi";

export default function OwnerOverview() {
  const { userProfile } = useAuth();
  const [loading] = useState(false);

  // Mock data - will be replaced with real data from Firestore
  const stats = {
    totalProperties: 5,
    totalUnits: 12,
    occupiedUnits: 10,
    vacantUnits: 2,
    totalTenants: 15,
    monthlyRevenue: 8500,
    pendingRent: 1200,
    overdueRent: 450,
    openRequests: 3,
  };

  const occupancyRate = Math.round((stats.occupiedUnits / stats.totalUnits) * 100);

  const recentApplications = [
    { id: 1, name: "John Smith", listing: "Modern Studio in Mitte", status: "new", date: "2 hours ago" },
    { id: 2, name: "Maria Garcia", listing: "2BR Apartment Kreuzberg", status: "in_review", date: "1 day ago" },
    { id: 3, name: "Alex Johnson", listing: "Room in Shared Flat", status: "viewing_requested", date: "2 days ago" },
  ];

  const upcomingRent = [
    { id: 1, tenant: "Sarah Wilson", unit: "Apt 2B", amount: 850, dueDate: "Nov 1" },
    { id: 2, tenant: "Mike Brown", unit: "Apt 3A", amount: 950, dueDate: "Nov 1" },
    { id: 3, tenant: "Lisa Chen", unit: "Room 1", amount: 550, dueDate: "Nov 3" },
  ];

  const openMaintenance = [
    { id: 1, title: "Heating not working", unit: "Apt 2B", priority: "high", date: "Oct 28" },
    { id: 2, title: "Leaky faucet", unit: "Apt 1A", priority: "medium", date: "Oct 26" },
    { id: 3, title: "Window won't close", unit: "Room 3", priority: "low", date: "Oct 25" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {userProfile?.displayName?.split(" ")[0] || "Owner"}!
          </h1>
          <p className="mt-1 text-gray-500">
            Here's what's happening with your properties today.
          </p>
        </div>
        <ButtonLink to="/dashboard/listings/new" className="gap-2">
          <FiPlus className="h-4 w-4" />
          Add New Listing
        </ButtonLink>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Properties"
          value={stats.totalProperties}
          icon={FiMapPin}
          change={`${stats.totalUnits} units`}
          trend="neutral"
        />
        <StatsCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon={FiHome}
          change={`${stats.vacantUnits} vacant`}
          trend={occupancyRate > 80 ? "up" : "down"}
        />
        <StatsCard
          label="Monthly Revenue"
          value={`€${stats.monthlyRevenue.toLocaleString()}`}
          icon={FiDollarSign}
          change="+12% from last month"
          trend="up"
        />
        <StatsCard
          label="Active Tenants"
          value={stats.totalTenants}
          icon={FiUsers}
          change={`${openMaintenance.length} open requests`}
          trend="neutral"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.pendingRent > 0 && (
          <Card className="border-l-4 border-l-amber-500 bg-amber-50">
            <div className="flex items-start gap-3">
              <FiDollarSign className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Pending Rent</p>
                <p className="text-2xl font-bold text-amber-900">
                  €{stats.pendingRent.toLocaleString()}
                </p>
                <Link
                  to="/dashboard/rent"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800"
                >
                  View details <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}
        {stats.overdueRent > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Overdue Rent</p>
                <p className="text-2xl font-bold text-red-900">
                  €{stats.overdueRent.toLocaleString()}
                </p>
                <Link
                  to="/dashboard/rent?filter=overdue"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-800"
                >
                  Take action <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}
        {stats.openRequests > 0 && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Open Requests</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.openRequests}
                </p>
                <Link
                  to="/dashboard/requests"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
                >
                  View requests <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Applications */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <Link
              to="/dashboard/applications"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{app.name}</p>
                  <p className="text-sm text-gray-500">{app.listing}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      app.status === "new"
                        ? "info"
                        : app.status === "in_review"
                        ? "warning"
                        : "default"
                    }
                  >
                    {app.status.replace("_", " ")}
                  </Badge>
                  <p className="mt-1 text-xs text-gray-400">{app.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Rent */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Rent Due</h2>
            <Link
              to="/dashboard/rent"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {upcomingRent.map((rent) => (
              <div
                key={rent.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FiCalendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rent.tenant}</p>
                    <p className="text-sm text-gray-500">{rent.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">€{rent.amount}</p>
                  <p className="text-sm text-gray-500">Due {rent.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Open Maintenance Requests */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Open Maintenance Requests</h2>
            <Link
              to="/dashboard/requests"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="pb-3 font-medium">Issue</th>
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium">Priority</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openMaintenance.map((request) => (
                  <tr key={request.id}>
                    <td className="py-3 font-medium text-gray-900">{request.title}</td>
                    <td className="py-3 text-gray-500">{request.unit}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          request.priority === "high"
                            ? "danger"
                            : request.priority === "medium"
                            ? "warning"
                            : "default"
                        }
                      >
                        {request.priority}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500">{request.date}</td>
                    <td className="py-3">
                      <Link
                        to={`/dashboard/requests/${request.id}`}
                        className="text-primary hover:text-primary-dark"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
