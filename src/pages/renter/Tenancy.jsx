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
  Spinner,
  Avatar,
} from "../../components/ui";
import {
  FiHome,
  FiCalendar,
  FiUser,
  FiMapPin,
  FiDollarSign,
  FiFileText,
  FiMessageSquare,
  FiUsers,
  FiClock,
  FiPhone,
  FiMail,
  FiKey,
} from "react-icons/fi";
import { queryDocuments, getDocument, COLLECTIONS } from "../../lib/firestore";
import { TENANCY_STATUSES, getStatusConfig, formatDate, formatCurrency } from "../../lib/constants";

export default function RenterTenancy() {
  const { user } = useAuth();
  const [tenancy, setTenancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState(null);
  const [property, setProperty] = useState(null);
  const [owner, setOwner] = useState(null);
  const [coTenants, setCoTenants] = useState([]);

  useEffect(() => {
    fetchTenancy();
  }, [user?.uid]);

  const fetchTenancy = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Find active tenancy membership for this user
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
        
        if (tenancyData && tenancyData.status === "active") {
          setTenancy({ ...tenancyData, membership });

          // Fetch related data
          const [unitData, coTenantMemberships] = await Promise.all([
            getDocument(COLLECTIONS.UNITS, tenancyData.unitId),
            queryDocuments(
              COLLECTIONS.TENANCY_MEMBERS,
              [{ field: "tenancyId", operator: "==", value: membership.tenancyId }]
            ),
          ]);

          if (unitData) {
            setUnit(unitData);
            const propertyData = await getDocument(COLLECTIONS.PROPERTIES, unitData.propertyId);
            setProperty(propertyData);
          }

          // Fetch owner info
          const ownerData = await getDocument(COLLECTIONS.USERS, tenancyData.ownerId);
          setOwner(ownerData);

          // Fetch co-tenant user info
          const otherMembers = coTenantMemberships.filter(
            (m) => m.tenantUserId !== user.uid
          );
          const coTenantsWithDetails = await Promise.all(
            otherMembers.map(async (m) => {
              const userData = await getDocument(COLLECTIONS.USERS, m.tenantUserId);
              return { ...m, user: userData };
            })
          );
          setCoTenants(coTenantsWithDetails);
        }
      }
    } catch (error) {
      console.error("Error fetching tenancy:", error);
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
        <PageHeader title="My Tenancy" subtitle="Your current rental agreement details" />
        <Card>
          <EmptyState
            icon={FiHome}
            title="No active tenancy"
            description="Once you move into a property, your tenancy details will appear here."
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

  const statusConfig = getStatusConfig(TENANCY_STATUSES, tenancy.status);
  const startDate = tenancy.startDate?.toDate ? tenancy.startDate.toDate() : new Date(tenancy.startDate);
  
  // Calculate tenancy duration
  const now = new Date();
  const monthsIn = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30));

  return (
    <div className="space-y-6">
      <PageHeader title="My Tenancy" subtitle="Your current rental agreement details" />

      {/* Property Card */}
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FiHome className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{unit?.unitName || "Your Rental"}</h2>
              <p className="mt-1 flex items-center gap-1 text-gray-500">
                <FiMapPin className="h-4 w-4" />
                {property?.address}, {property?.city}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                <span className="text-sm text-gray-500">
                  {monthsIn} {monthsIn === 1 ? "month" : "months"} in
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <FiFileText className="h-4 w-4" />
              View Agreement
            </Button>
            <Button variant="outline" className="gap-2">
              <FiMessageSquare className="h-4 w-4" />
              Contact Owner
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Information */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="text-center">
          <FiDollarSign className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(tenancy.rentAmount)}</p>
          <p className="text-sm text-gray-500">Monthly Rent</p>
        </Card>
        <Card className="text-center">
          <FiCalendar className="mx-auto h-8 w-8 text-green-600" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatDate(startDate)}</p>
          <p className="text-sm text-gray-500">Start Date</p>
        </Card>
        <Card className="text-center">
          <FiClock className="mx-auto h-8 w-8 text-amber-600" />
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {tenancy.paymentDueDay || 1}
            {tenancy.paymentDueDay === 1 ? "st" : tenancy.paymentDueDay === 2 ? "nd" : tenancy.paymentDueDay === 3 ? "rd" : "th"}
          </p>
          <p className="text-sm text-gray-500">Payment Due Day</p>
        </Card>
        <Card className="text-center">
          <FiKey className="mx-auto h-8 w-8 text-blue-600" />
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(tenancy.depositAmount)}</p>
          <p className="text-sm text-gray-500">Deposit</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Details */}
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Property Details</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Property Type</span>
              <span className="font-medium text-gray-900 capitalize">{unit?.unitType || "Apartment"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Size</span>
              <span className="font-medium text-gray-900">{unit?.sqm || "—"} m²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bedrooms</span>
              <span className="font-medium text-gray-900">{unit?.bedrooms || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bathrooms</span>
              <span className="font-medium text-gray-900">{unit?.bathrooms || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Floor</span>
              <span className="font-medium text-gray-900">{unit?.floor || "Ground"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Furnished</span>
              <span className="font-medium text-gray-900">{unit?.furnished ? "Yes" : "No"}</span>
            </div>
          </div>
        </Card>

        {/* Owner Contact */}
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Property Owner</h3>
          <div className="flex items-start gap-4">
            <Avatar name={owner?.displayName || "Owner"} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{owner?.displayName || "Property Owner"}</p>
              {owner?.email && (
                <a
                  href={`mailto:${owner.email}`}
                  className="mt-1 flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
                >
                  <FiMail className="h-4 w-4" />
                  {owner.email}
                </a>
              )}
              {owner?.phone && (
                <a
                  href={`tel:${owner.phone}`}
                  className="mt-1 flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
                >
                  <FiPhone className="h-4 w-4" />
                  {owner.phone}
                </a>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1 gap-2">
              <FiMessageSquare className="h-4 w-4" />
              Send Message
            </Button>
          </div>
        </Card>

        {/* Co-Tenants */}
        {coTenants.length > 0 && (
          <Card className="lg:col-span-2">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Co-Tenants ({coTenants.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coTenants.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <Avatar name={member.user?.displayName || "Tenant"} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {member.user?.displayName || "Co-Tenant"}
                      {member.isPrimaryTenant && (
                        <Badge variant="primary" className="ml-2">Primary</Badge>
                      )}
                    </p>
                    {member.rentShareAmount && (
                      <p className="text-sm text-gray-500">
                        Rent share: {formatCurrency(member.rentShareAmount)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/my-home/rent"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FiDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pay Rent</p>
              <p className="text-sm text-gray-500">View & pay rent</p>
            </div>
          </Link>
          <Link
            to="/my-home/requests"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Maintenance</p>
              <p className="text-sm text-gray-500">Submit request</p>
            </div>
          </Link>
          <Link
            to="/my-home/documents"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FiFileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Documents</p>
              <p className="text-sm text-gray-500">View & upload</p>
            </div>
          </Link>
          <Link
            to="/my-home/messages"
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FiMessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Messages</p>
              <p className="text-sm text-gray-500">Contact owner</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
