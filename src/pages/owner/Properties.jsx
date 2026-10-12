import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getPropertiesByOwner,
  createProperty,
  updateDocument,
  deleteDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import { PROPERTY_TYPES, CITIES } from "../../lib/constants";
import {
  PageHeader,
  Card,
  Button,
  ButtonLink,
  Badge,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Textarea,
  Select,
  Alert,
} from "../../components/ui";
import {
  FiPlus,
  FiMapPin,
  FiHome,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiMoreVertical,
  FiLayers,
  FiUsers,
  FiDollarSign,
  FiGrid,
  FiList,
} from "react-icons/fi";

export default function OwnerProperties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    propertyType: "apartment_building",
    yearBuilt: "",
    description: "",
  });

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPropertiesByOwner(user.uid);
      setProperties(data);
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError("Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      postalCode: "",
      propertyType: "apartment_building",
      yearBuilt: "",
      description: "",
    });
    setEditingProperty(null);
    setError("");
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (property) => {
    setFormData({
      name: property.name || "",
      address: property.address || "",
      city: property.city || "",
      postalCode: property.postalCode || "",
      propertyType: property.propertyType || "apartment_building",
      yearBuilt: property.yearBuilt || "",
      description: property.description || "",
    });
    setEditingProperty(property);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Property name is required");
      return;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return;
    }
    if (!formData.city) {
      setError("City is required");
      return;
    }

    setSaving(true);
    try {
      if (editingProperty) {
        await updateDocument(COLLECTIONS.PROPERTIES, editingProperty.id, formData);
      } else {
        await createProperty(user.uid, formData);
      }
      closeModal();
      fetchProperties();
    } catch (err) {
      console.error("Error saving property:", err);
      setError("Failed to save property. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    setSaving(true);
    try {
      await deleteDocument(COLLECTIONS.PROPERTIES, deleteConfirm.id);
      setDeleteConfirm(null);
      fetchProperties();
    } catch (err) {
      console.error("Error deleting property:", err);
      setError("Failed to delete property");
    } finally {
      setSaving(false);
    }
  };

  const getPropertyTypeLabel = (type) => {
    return PROPERTY_TYPES.find((t) => t.value === type)?.label || type;
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
        title="Properties"
        subtitle={`Manage your ${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Grid view"
              >
                <FiGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-2 transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="List view"
              >
                <FiList className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={openAddModal} className="gap-2">
              <FiPlus className="h-4 w-4" />
              Add Property
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {properties.length === 0 ? (
        <EmptyState
          icon={FiMapPin}
          title="No properties yet"
          description="Add your first property to start managing units and creating listings for tenants."
          action={
            <Button onClick={openAddModal} className="gap-2">
              <FiPlus className="h-4 w-4" />
              Add Your First Property
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={() => openEditModal(property)}
              onDelete={() => setDeleteConfirm(property)}
              onView={() => navigate(`/dashboard/properties/${property.id}`)}
              getPropertyTypeLabel={getPropertyTypeLabel}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyRow
              key={property.id}
              property={property}
              onEdit={() => openEditModal(property)}
              onDelete={() => setDeleteConfirm(property)}
              onView={() => navigate(`/dashboard/properties/${property.id}`)}
              getPropertyTypeLabel={getPropertyTypeLabel}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingProperty ? "Edit Property" : "Add New Property"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Input
            label="Property Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Sunrise Apartments"
            required
          />

          <Input
            label="Street Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g., Hauptstraße 123"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="City"
              options={CITIES.map((c) => ({ value: c, label: c }))}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Select city"
              required
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="e.g., 10115"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Property Type"
              options={PROPERTY_TYPES}
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            />
            <Input
              label="Year Built"
              type="number"
              value={formData.yearBuilt}
              onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
              placeholder="e.g., 2010"
              min="1800"
              max={new Date().getFullYear()}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your property..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingProperty ? "Save Changes" : "Add Property"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Property"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? 
            This will also delete all associated units and listings.
          </p>
          <Alert variant="warning">
            This action cannot be undone.
          </Alert>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>
              Delete Property
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PropertyCard({ property, onEdit, onDelete, onView, getPropertyTypeLabel }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="card-hover relative overflow-hidden">
      {/* Property Image Placeholder */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary/20 to-primary/5" />
      
      <div className="relative pt-16">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100">
              <FiHome className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1">{property.name}</h3>
              <p className="text-sm text-gray-500">{property.city}</p>
            </div>
          </div>
          
          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { onView(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiEye className="h-4 w-4" />
                    View Details
                  </button>
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiEdit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FiTrash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Address */}
        <p className="mt-4 flex items-start gap-2 text-sm text-gray-500">
          <FiMapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{property.address}, {property.postalCode}</span>
        </p>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400">
              <FiLayers className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">{property.totalUnits || 0}</p>
            <p className="text-xs text-gray-500">Units</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <div className="flex items-center justify-center gap-1 text-gray-400">
              <FiUsers className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">{property.occupiedUnits || 0}</p>
            <p className="text-xs text-gray-500">Occupied</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-400">
              <FiHome className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {(property.totalUnits || 0) - (property.occupiedUnits || 0)}
            </p>
            <p className="text-xs text-gray-500">Vacant</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
          <Badge variant="default">
            {getPropertyTypeLabel(property.propertyType)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onView} className="gap-1.5">
            View Details
            <FiEye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PropertyRow({ property, onEdit, onDelete, onView, getPropertyTypeLabel }) {
  return (
    <Card className="card-hover">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FiHome className="h-7 w-7 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">{property.name}</h3>
            <Badge variant="default">{getPropertyTypeLabel(property.propertyType)}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-1.5">
            <FiMapPin className="h-3.5 w-3.5" />
            {property.address}, {property.city}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="font-semibold text-gray-900">{property.totalUnits || 0}</p>
            <p className="text-gray-500">Units</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{property.occupiedUnits || 0}</p>
            <p className="text-gray-500">Occupied</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-primary">
              {property.totalUnits > 0
                ? Math.round((property.occupiedUnits / property.totalUnits) * 100)
                : 0}%
            </p>
            <p className="text-gray-500">Occupancy</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary"
            title="View details"
          >
            <FiEye className="h-5 w-5" />
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary"
            title="Edit"
          >
            <FiEdit2 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <FiTrash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
