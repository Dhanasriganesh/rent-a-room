import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, toggleSavedListing, getRenterProfile } from "../../lib/firestore";
import { useAuth } from "../../context/AuthContext";
import { Card, Button, ButtonLink, Badge, Spinner, Alert } from "../../components/ui";
import ApplyModal from "../../components/applications/ApplyModal";
import {
  FiMapPin,
  FiHome,
  FiCalendar,
  FiUsers,
  FiSquare,
  FiCheck,
  FiHeart,
  FiShare2,
  FiMessageSquare,
  FiMail,
  FiPhone,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

export default function ListingDetail() {
  const { id, listingId, ownerId } = useParams();
  const listingDocId = listingId || id;
  const { user, isRenter, refreshProfile } = useAuth();
  const [listing, setListing] = useState(null);
  const [owner, setOwner] = useState(null);
  const [ownerBrand, setOwnerBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [listingDocId]);

  useEffect(() => {
    async function checkSaved() {
      if (!user?.uid || !isRenter || !listingDocId) return;
      const profile = await getRenterProfile(user.uid);
      setSaved(Boolean(profile?.savedListings?.includes(listingDocId)));
    }
    checkSaved();
  }, [user?.uid, isRenter, listingDocId]);

  const fetchListing = async () => {
    if (!listingDocId) return;
    setLoading(true);
    try {
      const listingDoc = await getDoc(doc(db, COLLECTIONS.LISTINGS, listingDocId));
      if (listingDoc.exists()) {
        const listingData = { id: listingDoc.id, ...listingDoc.data() };
        setListing(listingData);

        const [ownerDoc, profileDoc, siteDoc] = await Promise.all([
          getDoc(doc(db, COLLECTIONS.USERS, listingData.ownerId)),
          getDoc(doc(db, COLLECTIONS.OWNER_PROFILES, listingData.ownerId)),
          getDoc(doc(db, COLLECTIONS.OWNER_SITES, listingData.ownerId)),
        ]);

        if (ownerDoc.exists()) {
          setOwner({ id: ownerDoc.id, ...ownerDoc.data() });
        }
        setOwnerBrand({
          profile: profileDoc.exists() ? { id: profileDoc.id, ...profileDoc.data() } : null,
          site: siteDoc.exists() ? { id: siteDoc.id, ...siteDoc.data() } : null,
        });
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <FiHome className="mx-auto h-16 w-16 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Listing Not Found</h1>
        <p className="mt-2 text-gray-500">
          This listing may have been removed or is no longer available.
        </p>
        <ButtonLink to="/listings" className="mt-6">
          Browse All Listings
        </ButtonLink>
      </div>
    );
  }

  const amenities = listing.amenities || [];
  const images = listing.images || [];
  const brand =
    ownerBrand?.site?.brandSettings || ownerBrand?.profile?.brandSettings || {};
  const siteName =
    ownerBrand?.site?.siteName ||
    ownerBrand?.profile?.siteName ||
    owner?.displayName;
  const contactEmail = brand.contactEmail || owner?.email;
  const contactPhone = brand.contactPhone || owner?.phone;
  const whatsapp = (brand.whatsapp || contactPhone || "").replace(/\D/g, "");
  const showEmail = brand.showEmail !== false && contactEmail;
  const showWhatsApp = brand.showWhatsApp !== false && whatsapp;
  const showChat = brand.showInAppChat !== false;
  const messagesPath = user
    ? isRenter
      ? `/my-home/messages?listing=${listing.id}`
      : `/dashboard/messages`
    : `/login?redirect=/listings/${listing.id}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          to={ownerId ? `/owner/${ownerId}` : "/listings"}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
        >
          <FiChevronLeft className="h-4 w-4" />
          Back to listings
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Image Gallery */}
          <div className="relative overflow-hidden rounded-2xl bg-gray-200">
            <div className="aspect-video">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <FiHome className="h-20 w-20 text-gray-400" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"
                >
                  <FiChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"
                >
                  <FiChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === currentImageIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg ${
                    index === currentImageIndex ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Title & Location */}
          <div className="mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {listing.title}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-gray-500">
                  <FiMapPin className="h-5 w-5" />
                  {listing.address}, {listing.city}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!user || !isRenter) {
                      window.location.href = `/login?redirect=/listings/${listing.id}`;
                      return;
                    }
                    const next = await toggleSavedListing(user.uid, listing.id);
                    setSaved(next?.includes(listing.id));
                    await refreshProfile();
                  }}
                  className={`rounded-full p-2.5 ${
                    saved
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <FiHeart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
                </button>
                <button className="rounded-full bg-gray-100 p-2.5 text-gray-600 hover:bg-gray-200">
                  <FiShare2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Key Stats */}
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <FiHome className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {listing.propertyType?.charAt(0).toUpperCase() + listing.propertyType?.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <FiSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{listing.sqm} m²</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <FiUsers className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {listing.bedrooms} bed • {listing.bathrooms} bath
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <FiCalendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  Available {listing.availableFrom || "Now"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-gray-600">
              {listing.description || "No description provided."}
            </p>
          </Card>

          {/* Amenities */}
          {amenities.length > 0 && (
            <Card className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Amenities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenities.map((amenity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-gray-600"
                  >
                    <FiCheck className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* House Rules */}
          {listing.rules && (
            <Card className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900">House Rules</h2>
              <p className="mt-3 whitespace-pre-line text-gray-600">
                {listing.rules}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Price Card */}
            <Card>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  €{listing.rentAmount}
                  <span className="text-lg font-normal text-gray-500">/month</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Deposit: €{listing.depositAmount || listing.rentAmount * 2}
                </p>
              </div>

              <hr className="my-4" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Property Type</span>
                  <span className="font-medium">
                    {listing.propertyType?.charAt(0).toUpperCase() + listing.propertyType?.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Available From</span>
                  <span className="font-medium">
                    {listing.availableFrom || "Immediately"}
                  </span>
                </div>
                {listing.furnished !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Furnished</span>
                    <span className="font-medium">
                      {listing.furnished ? "Yes" : "No"}
                    </span>
                  </div>
                )}
                {listing.anmeldung !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Anmeldung</span>
                    <Badge variant={listing.anmeldung ? "success" : "default"}>
                      {listing.anmeldung ? "Possible" : "Not possible"}
                    </Badge>
                  </div>
                )}
              </div>

              <hr className="my-4" />

              <div className="space-y-3">
                {showChat && (
                  <ButtonLink to={messagesPath} className="w-full gap-2">
                    <FiMessageSquare className="h-4 w-4" />
                    In-app chat
                  </ButtonLink>
                )}
                {showEmail && (
                  <a
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                      `Inquiry: ${listing.title}`
                    )}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary hover:text-white"
                  >
                    <FiMail className="h-4 w-4" />
                    Email owner
                  </a>
                )}
                {showWhatsApp && (
                  <a
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                      `Hi, I'm interested in: ${listing.title}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setApplyOpen(true)}
                >
                  {user && isRenter ? "Apply for This Home" : "Enquire about this home"}
                </Button>
                {!(user && isRenter) && (
                  <Alert variant="info">
                    No account needed. The desk sends a login after you are accepted.
                  </Alert>
                )}
              </div>
            </Card>

            {/* Owner Card */}
            {(owner || siteName) && (
              <Card>
                <h3 className="font-semibold text-gray-900">Listed by</h3>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {(siteName || owner?.displayName)?.[0]?.toUpperCase() || "O"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{siteName}</p>
                    <p className="text-sm text-gray-500">Property Owner</p>
                  </div>
                </div>
                {(showEmail || contactPhone) && (
                  <div className="mt-4 space-y-2">
                    {showEmail && (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
                      >
                        <FiMail className="h-4 w-4" />
                        {contactEmail}
                      </a>
                    )}
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
                      >
                        <FiPhone className="h-4 w-4" />
                        {contactPhone}
                      </a>
                    )}
                  </div>
                )}
                {ownerId && (
                  <ButtonLink
                    to={`/owner/${ownerId}`}
                    variant="ghost"
                    size="sm"
                    className="mt-4 w-full"
                  >
                    View all listings from this owner
                  </ButtonLink>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      <ApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        listing={listing}
      />
    </div>
  );
}
