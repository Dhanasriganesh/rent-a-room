import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  Input,
  Textarea,
  Select,
  Button,
  Checkbox,
  Spinner,
  Alert,
} from "../../components/ui";
import {
  FiArrowLeft,
  FiSave,
  FiEye,
  FiImage,
  FiX,
  FiPlus,
  FiUpload,
} from "react-icons/fi";
import {
  createListing,
  getDocument,
  updateDocument,
  getAvailableUnitsByOwner,
  publishListing,
  COLLECTIONS,
} from "../../lib/firestore";
import { CITIES, UNIT_TYPES, AMENITIES } from "../../lib/constants";

export default function OwnerListingEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [imageUrls, setImageUrls] = useState([""]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "apartment",
    city: "",
    address: "",
    area: "",
    postalCode: "",
    rentAmount: "",
    depositAmount: "",
    utilitiesIncluded: false,
    utilitiesAmount: "",
    bedrooms: "1",
    bathrooms: "1",
    sqm: "",
    floor: "",
    totalFloors: "",
    furnished: false,
    anmeldung: true,
    availableFrom: "",
    minimumStay: "",
    maximumOccupancy: "1",
    amenities: [],
    rules: "",
    unitId: "",
  });

  useEffect(() => {
    fetchData();
  }, [id, user?.uid]);

  const fetchData = async () => {
    if (!user?.uid) return;
    
    try {
      // Fetch available units
      const units = await getAvailableUnitsByOwner(user.uid);
      setAvailableUnits(units);

      // If editing, fetch listing data
      if (isEditing) {
        setLoading(true);
        const listing = await getDocument(COLLECTIONS.LISTINGS, id);
        if (!listing || listing.ownerId !== user.uid) {
          navigate("/dashboard/listings");
          return;
        }
        setFormData({
          title: listing.title || "",
          description: listing.description || "",
          propertyType: listing.propertyType || "apartment",
          city: listing.city || "",
          address: listing.address || "",
          area: listing.area || "",
          postalCode: listing.postalCode || "",
          rentAmount: String(listing.rentAmount || ""),
          depositAmount: String(listing.depositAmount || ""),
          utilitiesIncluded: listing.utilitiesIncluded || false,
          utilitiesAmount: String(listing.utilitiesAmount || ""),
          bedrooms: String(listing.bedrooms || 1),
          bathrooms: String(listing.bathrooms || 1),
          sqm: String(listing.sqm || ""),
          floor: listing.floor || "",
          totalFloors: listing.totalFloors || "",
          furnished: listing.furnished || false,
          anmeldung: listing.anmeldung !== false,
          availableFrom: listing.availableFrom || "",
          minimumStay: listing.minimumStay || "",
          maximumOccupancy: String(listing.maximumOccupancy || 1),
          amenities: listing.amenities || [],
          rules: listing.rules || "",
          unitId: listing.unitId || "",
        });
        setImageUrls(listing.images?.length > 0 ? [...listing.images, ""] : [""]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, shouldPublish = false) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    if (shouldPublish) setPublishing(true);

    try {
      const images = imageUrls.filter((url) => url.trim() !== "");
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType,
        city: formData.city,
        address: formData.address,
        area: formData.area,
        postalCode: formData.postalCode,
        rentAmount: parseFloat(formData.rentAmount) || 0,
        depositAmount: parseFloat(formData.depositAmount) || 0,
        utilitiesIncluded: formData.utilitiesIncluded,
        utilitiesAmount: parseFloat(formData.utilitiesAmount) || 0,
        bedrooms: parseInt(formData.bedrooms) || 1,
        bathrooms: parseInt(formData.bathrooms) || 1,
        sqm: parseFloat(formData.sqm) || 0,
        floor: formData.floor,
        totalFloors: formData.totalFloors,
        furnished: formData.furnished,
        anmeldung: formData.anmeldung,
        availableFrom: formData.availableFrom,
        minimumStay: formData.minimumStay,
        maximumOccupancy: parseInt(formData.maximumOccupancy) || 1,
        amenities: formData.amenities,
        rules: formData.rules,
        unitId: formData.unitId || null,
        images,
      };

      let listingId = id;
      if (isEditing) {
        await updateDocument(COLLECTIONS.LISTINGS, id, listingData);
      } else {
        listingId = await createListing(user.uid, listingData);
      }

      if (shouldPublish) {
        await publishListing(listingId);
      }

      navigate("/dashboard/listings");
    } catch (error) {
      console.error("Error saving listing:", error);
      setError("Failed to save listing. Please try again.");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    
    // Add new empty field if this is the last one and it's not empty
    if (index === newUrls.length - 1 && value.trim() !== "") {
      newUrls.push("");
    }
    
    setImageUrls(newUrls);
  };

  const removeImageUrl = (index) => {
    if (imageUrls.length === 1) {
      setImageUrls([""]);
    } else {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
    }
  };

  const handleUnitSelect = (unitId) => {
    if (!unitId) {
      setFormData((prev) => ({ ...prev, unitId: "" }));
      return;
    }
    
    const unit = availableUnits.find((u) => u.id === unitId);
    if (unit) {
      setFormData((prev) => ({
        ...prev,
        unitId,
        propertyType: unit.unitType || prev.propertyType,
        bedrooms: String(unit.bedrooms || prev.bedrooms),
        bathrooms: String(unit.bathrooms || prev.bathrooms),
        sqm: String(unit.sqm || prev.sqm),
        floor: unit.floor || prev.floor,
        rentAmount: String(unit.rentAmount || prev.rentAmount),
        depositAmount: String(unit.depositAmount || prev.depositAmount),
        furnished: unit.furnished || prev.furnished,
        amenities: unit.amenities?.length > 0 ? unit.amenities : prev.amenities,
      }));
    }
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/listings"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
        >
          <FiArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Listing" : "Create New Listing"}
          </h1>
          <p className="text-sm text-gray-500">
            {isEditing ? "Update your listing details" : "Fill in the details to create a new listing"}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Link to Unit */}
        {availableUnits.length > 0 && !isEditing && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Link to Existing Unit (Optional)</h2>
            <Select
              label="Select Unit"
              options={[
                { value: "", label: "Create standalone listing" },
                ...availableUnits.map((unit) => ({
                  value: unit.id,
                  label: `${unit.unitName} - ${unit.bedrooms} bed, ${unit.sqm}m², €${unit.rentAmount}/mo`,
                })),
              ]}
              value={formData.unitId}
              onChange={(e) => handleUnitSelect(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-500">
              Linking to a unit will auto-fill some details and keep them in sync.
            </p>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Listing Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Modern 2BR Apartment in Mitte"
              required
              className="sm:col-span-2"
            />
            <Select
              label="Property Type"
              options={UNIT_TYPES}
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            />
            <Select
              label="City *"
              options={[
                { value: "", label: "Select City" },
                ...CITIES.map((city) => ({ value: city, label: city })),
              ]}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="Address *"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street and house number"
              required
              className="sm:col-span-2"
            />
            <Input
              label="Area / Neighborhood"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="e.g., Mitte, Kreuzberg"
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="10115"
            />
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="sm:col-span-2"
              placeholder="Describe your property, its features, the neighborhood, and what makes it special..."
            />
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Pricing & Availability</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Monthly Rent (€) *"
              type="number"
              min="0"
              value={formData.rentAmount}
              onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
              required
            />
            <Input
              label="Deposit (€)"
              type="number"
              min="0"
              value={formData.depositAmount}
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
              placeholder="Usually 2-3 months rent"
            />
            <Input
              label="Utilities (€/month)"
              type="number"
              min="0"
              value={formData.utilitiesAmount}
              onChange={(e) => setFormData({ ...formData, utilitiesAmount: e.target.value })}
            />
            <Input
              label="Available From *"
              type="date"
              value={formData.availableFrom}
              onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
              required
            />
            <Input
              label="Minimum Stay"
              value={formData.minimumStay}
              onChange={(e) => setFormData({ ...formData, minimumStay: e.target.value })}
              placeholder="e.g., 12 months"
            />
            <Input
              label="Max Occupants"
              type="number"
              min="1"
              value={formData.maximumOccupancy}
              onChange={(e) => setFormData({ ...formData, maximumOccupancy: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Checkbox
              label="Utilities included in rent"
              checked={formData.utilitiesIncluded}
              onChange={(e) => setFormData({ ...formData, utilitiesIncluded: e.target.checked })}
            />
          </div>
        </Card>

        {/* Property Details */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Property Details</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Input
              label="Bedrooms"
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
            />
            <Input
              label="Bathrooms"
              type="number"
              min="0"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
            />
            <Input
              label="Size (m²)"
              type="number"
              min="0"
              value={formData.sqm}
              onChange={(e) => setFormData({ ...formData, sqm: e.target.value })}
            />
            <Input
              label="Floor"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              placeholder="e.g., 2nd"
            />
            <Input
              label="Total Floors"
              value={formData.totalFloors}
              onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
              placeholder="e.g., 5"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            <Checkbox
              label="Furnished"
              checked={formData.furnished}
              onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
            />
            <Checkbox
              label="Anmeldung Possible"
              checked={formData.anmeldung}
              onChange={(e) => setFormData({ ...formData, anmeldung: e.target.checked })}
            />
          </div>
        </Card>

        {/* Amenities */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => (
              <button
                key={amenity.value}
                type="button"
                onClick={() => handleAmenityToggle(amenity.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  formData.amenities.includes(amenity.value)
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {amenity.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Images */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Images</h2>
          <p className="mb-4 text-sm text-gray-500">
            Add image URLs for your listing. The first image will be used as the cover photo.
          </p>
          <div className="space-y-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {url && url.startsWith("http") ? (
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="h-12 w-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "";
                        e.target.className = "hidden";
                      }}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <FiImage className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <Input
                  value={url}
                  onChange={(e) => handleImageUrlChange(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageUrl(index)}
                    className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* House Rules */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">House Rules</h2>
          <Textarea
            value={formData.rules}
            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
            placeholder="No smoking, no pets, quiet hours after 10pm, shoes off inside..."
            rows={4}
          />
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/dashboard/listings")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            loading={saving && !publishing}
            className="gap-2"
          >
            <FiSave className="h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            loading={publishing}
            className="gap-2"
          >
            <FiEye className="h-4 w-4" />
            {isEditing ? "Update & Publish" : "Save & Publish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
