import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  ButtonLink,
  Button,
  Badge,
  Spinner,
  Input,
  Select,
} from "../../components/ui";
import {
  FiList,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiMapPin,
  FiDollarSign,
  FiGrid,
  FiSearch,
  FiFilter,
  FiExternalLink,
  FiPause,
  FiPlay,
  FiEyeOff,
} from "react-icons/fi";
import { getListingsByOwner, updateDocument, deleteDocument, COLLECTIONS } from "../../lib/firestore";
import { LISTING_STATUSES, UNIT_TYPES, formatCurrency, getStatusConfig } from "../../lib/constants";

export default function OwnerListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchListings();
  }, [user?.uid]);

  const fetchListings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getListingsByOwner(user.uid);
      setListings(data);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === "published") {
        updates.publishedAt = new Date();
      }
      await updateDocument(COLLECTIONS.LISTINGS, listingId, updates);
      await fetchListings();
    } catch (error) {
      console.error("Error updating listing status:", error);
    }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteDocument(COLLECTIONS.LISTINGS, listingId);
      await fetchListings();
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      !searchQuery ||
      listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: listings.length,
    published: listings.filter((l) => l.status === "published").length,
    draft: listings.filter((l) => l.status === "draft").length,
    rented: listings.filter((l) => l.status === "rented").length,
  };

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
        title="Listings"
        subtitle="Manage your property listings and reach potential tenants"
        actions={
          <ButtonLink to="/dashboard/listings/new" className="gap-2">
            <FiPlus className="h-4 w-4" />
            Create Listing
          </ButtonLink>
        }
      />

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Listings</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">{stats.published}</p>
          <p className="text-sm text-gray-500">Published</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.draft}</p>
          <p className="text-sm text-gray-500">Drafts</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.rented}</p>
          <p className="text-sm text-gray-500">Rented</p>
        </Card>
      </div>

      {listings.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiList}
            title="No listings yet"
            description="Create your first listing to start receiving applications from potential tenants."
            action={
              <ButtonLink to="/dashboard/listings/new" className="gap-2">
                <FiPlus className="h-4 w-4" />
                Create Your First Listing
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: "", label: "All Statuses" },
                ...LISTING_STATUSES,
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            />
            <div className="hidden gap-1 rounded-lg border border-gray-200 p-1 sm:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-2 ${viewMode === "grid" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <FiGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-2 ${viewMode === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                <FiList className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Listings */}
          {filteredListings.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiSearch}
                title="No listings found"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Rent</th>
                      <th className="px-4 py-3 font-medium">Views</th>
                      <th className="px-4 py-3 font-medium">Applications</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredListings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                              {listing.images?.[0] ? (
                                <img
                                  src={listing.images[0]}
                                  alt={listing.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <FiList className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 line-clamp-1">
                                {listing.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {UNIT_TYPES.find((t) => t.value === listing.propertyType)?.label || listing.propertyType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {listing.city}, {listing.area}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formatCurrency(listing.rentAmount)}/mo
                        </td>
                        <td className="px-4 py-3 text-gray-500">{listing.viewCount || 0}</td>
                        <td className="px-4 py-3">
                          <Badge variant={listing.applicationCount > 0 ? "info" : "default"}>
                            {listing.applicationCount || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusConfig(LISTING_STATUSES, listing.status).color}>
                            {getStatusConfig(LISTING_STATUSES, listing.status).label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/listings/${listing.id}/edit`}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </Link>
                            {listing.status === "published" && (
                              <a
                                href={`/listings/${listing.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              >
                                <FiExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(listing.id)}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ListingCard({ listing, onStatusChange }) {
  const statusConfig = getStatusConfig(LISTING_STATUSES, listing.status);

  const getStatusActions = () => {
    switch (listing.status) {
      case "draft":
        return [
          { label: "Publish", icon: FiPlay, action: () => onStatusChange(listing.id, "published"), variant: "success" },
        ];
      case "published":
        return [
          { label: "Pause", icon: FiPause, action: () => onStatusChange(listing.id, "paused"), variant: "warning" },
        ];
      case "paused":
        return [
          { label: "Resume", icon: FiPlay, action: () => onStatusChange(listing.id, "published"), variant: "success" },
        ];
      default:
        return [];
    }
  };

  const statusActions = getStatusActions();

  return (
    <Card className="overflow-hidden p-0">
      {/* Image */}
      <div className="aspect-video overflow-hidden bg-gray-200">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FiList className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
          <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <FiMapPin className="h-4 w-4" />
          {listing.city}, {listing.area}
        </p>

        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-lg font-bold text-primary">
            {formatCurrency(listing.rentAmount)}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1">
              <FiEye className="h-4 w-4" />
              {listing.viewCount || 0}
            </span>
            <span>{listing.bedrooms} bed</span>
            <span>{listing.sqm} m²</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
          <Link
            to={`/dashboard/listings/${listing.id}/edit`}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FiEdit2 className="h-4 w-4" />
            Edit
          </Link>
          {statusActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.action}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                action.variant === "success"
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </button>
          ))}
          {listing.status === "published" && (
            <a
              href={`/listings/${listing.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <FiExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
