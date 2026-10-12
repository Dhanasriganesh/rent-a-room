import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  ButtonLink,
  Modal,
  Input,
  Select,
  Spinner,
  Avatar,
  StatsCard,
} from "../../components/ui";
import {
  FiUsers,
  FiHome,
  FiCalendar,
  FiSearch,
  FiPlus,
  FiMail,
  FiPhone,
  FiDollarSign,
  FiFileText,
  FiMessageSquare,
  FiMoreVertical,
  FiEdit2,
  FiUserPlus,
} from "react-icons/fi";
import {
  getActiveTenanciesByOwner,
  getTenancyWithMembers,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  TENANCY_STATUSES,
  getStatusConfig,
  formatDate,
  formatCurrency,
} from "../../lib/constants";

export default function OwnerTenants() {
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenancy, setSelectedTenancy] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchTenancies();
  }, [user?.uid]);

  const fetchTenancies = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getActiveTenanciesByOwner(user.uid);
      // Fetch unit and member details for each tenancy
      const tenanciesWithDetails = await Promise.all(
        data.map(async (tenancy) => {
          const [unit, tenancyWithMembers] = await Promise.all([
            getDocument(COLLECTIONS.UNITS, tenancy.unitId),
            getTenancyWithMembers(tenancy.id),
          ]);
          return {
            ...tenancy,
            unit,
            members: tenancyWithMembers?.members || [],
          };
        })
      );
      setTenancies(tenanciesWithDetails);
    } catch (error) {
      console.error("Error fetching tenancies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenancies = tenancies.filter((tenancy) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const memberMatch = tenancy.members?.some(
      (m) =>
        m.user?.displayName?.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query)
    );
    const unitMatch = tenancy.unit?.unitName?.toLowerCase().includes(query);
    return memberMatch || unitMatch;
  });

  const totalTenants = tenancies.reduce((sum, t) => sum + (t.members?.length || 0), 0);
  const totalRent = tenancies.reduce((sum, t) => sum + (t.rentAmount || 0), 0);

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
        title="Tenants"
        subtitle="View and manage your current tenants and tenancies"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          label="Active Tenancies"
          value={tenancies.length}
          icon={FiFileText}
          trend="neutral"
        />
        <StatsCard
          label="Total Tenants"
          value={totalTenants}
          icon={FiUsers}
          trend="neutral"
        />
        <StatsCard
          label="Monthly Rent Income"
          value={formatCurrency(totalRent)}
          icon={FiDollarSign}
          trend="up"
        />
      </div>

      {tenancies.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiUsers}
            title="No active tenants yet"
            description="Your tenants will appear here once you create tenancies from accepted applications."
            action={
              <ButtonLink to="/dashboard/applications" className="gap-2">
                <FiFileText className="h-4 w-4" />
                View Applications
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tenancies List */}
          {filteredTenancies.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiSearch}
                title="No tenants found"
                description="Try adjusting your search."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTenancies.map((tenancy) => (
                <TenancyCard
                  key={tenancy.id}
                  tenancy={tenancy}
                  onViewDetails={() => {
                    setSelectedTenancy(tenancy);
                    setShowDetailModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTenancy(null);
        }}
        title="Tenancy Details"
        size="lg"
      >
        {selectedTenancy && (
          <div className="space-y-6">
            {/* Unit Info */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FiHome className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedTenancy.unit?.unitName || "Unknown Unit"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedTenancy.unit?.bedrooms} bed • {selectedTenancy.unit?.bathrooms} bath •{" "}
                    {selectedTenancy.unit?.sqm} m²
                  </p>
                </div>
              </div>
            </div>

            {/* Tenancy Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(selectedTenancy.startDate)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">End Date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedTenancy.endDate ? formatDate(selectedTenancy.endDate) : "Open-ended"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Monthly Rent</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatCurrency(selectedTenancy.rentAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Payment Due Day</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedTenancy.paymentDueDay || 1}
                  {selectedTenancy.paymentDueDay === 1
                    ? "st"
                    : selectedTenancy.paymentDueDay === 2
                    ? "nd"
                    : selectedTenancy.paymentDueDay === 3
                    ? "rd"
                    : "th"}{" "}
                  of each month
                </p>
              </div>
            </div>

            {/* Tenants */}
            <div>
              <h4 className="mb-3 font-semibold text-gray-900">
                Tenants ({selectedTenancy.members?.length || 0})
              </h4>
              <div className="space-y-3">
                {selectedTenancy.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.user?.displayName || "Unknown"} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user?.displayName || "Unknown"}
                          {member.isPrimaryTenant && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{member.user?.email}</p>
                      </div>
                    </div>
                    {member.rentShareAmount && (
                      <p className="text-sm font-medium text-gray-600">
                        {formatCurrency(member.rentShareAmount)}/mo
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" className="gap-2">
                <FiUserPlus className="h-4 w-4" />
                Add Tenant
              </Button>
              <Button variant="outline" className="gap-2">
                <FiMessageSquare className="h-4 w-4" />
                Message All
              </Button>
              <Button variant="outline" className="gap-2">
                <FiFileText className="h-4 w-4" />
                View Documents
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TenancyCard({ tenancy, onViewDetails }) {
  const statusConfig = getStatusConfig(TENANCY_STATUSES, tenancy.status);
  const primaryTenant = tenancy.members?.find((m) => m.isPrimaryTenant);
  const otherTenants = tenancy.members?.filter((m) => !m.isPrimaryTenant) || [];

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Unit & Primary Tenant */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FiHome className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{tenancy.unit?.unitName || "Unknown Unit"}</h3>
            <div className="mt-1 flex items-center gap-4">
              <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
              <span className="text-sm text-gray-500">
                Since {formatDate(tenancy.startDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Tenants */}
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {tenancy.members?.slice(0, 4).map((member) => (
              <Avatar
                key={member.id}
                name={member.user?.displayName || "?"}
                size="sm"
                className="ring-2 ring-white"
              />
            ))}
            {tenancy.members?.length > 4 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 ring-2 ring-white">
                +{tenancy.members.length - 4}
              </div>
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">
              {primaryTenant?.user?.displayName || "No primary tenant"}
            </p>
            {otherTenants.length > 0 && (
              <p className="text-gray-500">+{otherTenants.length} more</p>
            )}
          </div>
        </div>

        {/* Rent & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(tenancy.rentAmount)}
            </p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <FiMessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
