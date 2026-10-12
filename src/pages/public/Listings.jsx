import { useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../lib/firestore";
import { Card, Badge, Button, Input, Select, EmptyState, Spinner } from "../../components/ui";
import { FiMapPin, FiHome, FiDollarSign, FiFilter, FiGrid, FiList, FiHeart, FiSearch } from "react-icons/fi";

const propertyTypes = [
  { value: "", label: "All Types" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "room", label: "Room" },
  { value: "studio", label: "Studio" },
];

const priceRanges = [
  { value: "", label: "Any Price" },
  { value: "0-500", label: "Under €500" },
  { value: "500-1000", label: "€500 - €1,000" },
  { value: "1000-1500", label: "€1,000 - €1,500" },
  { value: "1500-2000", label: "€1,500 - €2,000" },
  { value: "2000+", label: "€2,000+" },
];

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ownerId } = useParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cityFilter = searchParams.get("city") || "";
  const typeFilter = searchParams.get("type") || "";
  const priceFilter = searchParams.get("price") || "";

  useEffect(() => {
    fetchListings();
  }, [ownerId, cityFilter, typeFilter, priceFilter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, COLLECTIONS.LISTINGS),
        where("status", "==", "published"),
        orderBy("publishedAt", "desc")
      );

      if (ownerId) {
        q = query(
          collection(db, COLLECTIONS.LISTINGS),
          where("ownerId", "==", ownerId),
          where("status", "==", "published"),
          orderBy("publishedAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Apply client-side filters
      if (cityFilter) {
        results = results.filter((l) =>
          l.city?.toLowerCase().includes(cityFilter.toLowerCase())
        );
      }
      if (typeFilter) {
        results = results.filter((l) => l.propertyType === typeFilter);
      }
      if (priceFilter) {
        const [min, max] = priceFilter.split("-").map(Number);
        results = results.filter((l) => {
          if (max) return l.rentAmount >= min && l.rentAmount <= max;
          return l.rentAmount >= min;
        });
      }

      setListings(results);
    } catch (error) {
      console.error("Error fetching listings:", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = cityFilter || typeFilter || priceFilter;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {ownerId ? "Available Listings" : "Find Your Perfect Home"}
        </h1>
        <p className="mt-2 text-gray-500">
          {listings.length} {listings.length === 1 ? "listing" : "listings"} available
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by city or location..."
              value={cityFilter}
              onChange={(e) => updateFilter("city", e.target.value)}
              className="pl-12"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filtersOpen ? "primary" : "outline"}
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2"
            >
              <FiFilter className="h-4 w-4" />
              Filters
            </Button>
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
        </div>

        {/* Filter Panel */}
        {filtersOpen && (
          <Card className="animate-slide-down">
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Property Type"
                options={propertyTypes}
                value={typeFilter}
                onChange={(e) => updateFilter("type", e.target.value)}
              />
              <Select
                label="Price Range"
                options={priceRanges}
                value={priceFilter}
                onChange={(e) => updateFilter("price", e.target.value)}
              />
              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={FiHome}
          title="No listings found"
          description="Try adjusting your filters or search in a different area."
          action={
            hasActiveFilters && (
              <Button onClick={clearFilters}>Clear Filters</Button>
            )
          }
        />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-4"
          }
        >
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} viewMode={viewMode} ownerId={ownerId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, viewMode, ownerId }) {
  const linkPath = ownerId
    ? `/owner/${ownerId}/${listing.id}`
    : `/listings/${listing.id}`;

  if (viewMode === "list") {
    return (
      <Link to={linkPath}>
        <Card className="card-hover flex gap-4 p-4">
          <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
            {listing.images?.[0] ? (
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <FiHome className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{listing.title}</h3>
              <Badge variant="success">€{listing.rentAmount}/mo</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <FiMapPin className="h-4 w-4" />
              {listing.city}, {listing.area}
            </p>
            <div className="mt-auto flex items-center gap-4 pt-2 text-sm text-gray-500">
              <span>{listing.bedrooms} bed</span>
              <span>{listing.bathrooms} bath</span>
              <span>{listing.sqm} m²</span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={linkPath}>
      <Card className="card-hover overflow-hidden p-0">
        <div className="aspect-listing overflow-hidden bg-gray-200">
          {listing.images?.[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <FiHome className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {listing.title}
            </h3>
            <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500">
              <FiHeart className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <FiMapPin className="h-4 w-4" />
            {listing.city}, {listing.area}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-lg font-bold text-primary">
              €{listing.rentAmount}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{listing.bedrooms} bed</span>
              <span>•</span>
              <span>{listing.sqm} m²</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
