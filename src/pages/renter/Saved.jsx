import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDocument, toggleSavedListing, COLLECTIONS } from "../../lib/firestore";
import {
  PageHeader,
  Card,
  EmptyState,
  ButtonLink,
  Button,
  Spinner,
  Badge,
} from "../../components/ui";
import { FiHeart, FiSearch, FiMapPin, FiHome } from "react-icons/fi";
import { formatCurrency } from "../../lib/constants";

export default function RenterSaved() {
  const { user, renterProfile, refreshProfile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const ids = renterProfile?.savedListings || [];
        const rows = await Promise.all(ids.map((id) => getDocument(COLLECTIONS.LISTINGS, id)));
        setListings(rows.filter(Boolean));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.uid, renterProfile?.savedListings]);

  const unsave = async (listingId) => {
    await toggleSavedListing(user.uid, listingId);
    await refreshProfile();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Saved Homes" subtitle="Your favorite listings" />
      {listings.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiHeart}
            title="No saved homes yet"
            description="When you save listings, they'll appear here for easy access."
            action={
              <ButtonLink to="/my-home/discover" className="gap-2">
                <FiSearch className="h-4 w-4" />
                Discover Homes
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden !p-0">
              <Link to={`/listings/${listing.id}`}>
                <div className="aspect-video bg-gray-100">
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <FiHome className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/listings/${listing.id}`} className="font-semibold text-gray-900 hover:text-primary">
                    {listing.title}
                  </Link>
                  <Badge variant="success">{formatCurrency(listing.rentAmount)}/mo</Badge>
                </div>
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <FiMapPin className="h-4 w-4" />
                  {listing.city}
                </p>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => unsave(listing.id)}>
                  <FiHeart className="h-4 w-4 fill-current text-red-500" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
