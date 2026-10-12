import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Button,
  ButtonLink,
  Badge,
  Modal,
  Input,
  Textarea,
  Select,
  Checkbox,
  Spinner,
  StatsCard,
} from "../../components/ui";
import {
  FiHome,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiArrowLeft,
  FiGrid,
  FiList,
  FiMoreVertical,
  FiEye,
  FiKey,
  FiTool,
} from "react-icons/fi";
import {
  getDocument,
  getUnitsByProperty,
  createUnit,
  updateDocument,
  deleteDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import { UNIT_TYPES, AMENITIES, formatCurrency, getStatusConfig } from "../../lib/constants";

const UNIT_STATUSES = [
  { value: "available", label: "Available", color: "success" },
  { value: "reserved", label: "Reserved", color: "warning" },
  { value: "occupied", label: "Occupied", color: "info" },
  { value: "maintenance", label: "Maintenance", color: "danger" },
];

export default function OwnerPropertyDetail() {
  const { id: propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    unitName: "",
    unitType: "apartment",
    floor: "",
    bedrooms: "1",
    bathrooms: "1",
    sqm: "",
    rentAmount: "",
    depositAmount: "",
    availableFrom: "",
    occupancyLimit: "1",
    furnished: false,
    amenities: [],
    description: "",
  });

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    setLoading(true);
    try {
      const [propertyData, unitsData] = await Promise.all([
        getDocument(COLLECTIONS.PROPERTIES, propertyId),
        getUnitsByProperty(propertyId),
      ]);
      
      if (!propertyData || propertyData.ownerId !== user.uid) {
        navigate("/dashboard/properties");
        return;
      }
      
      setProperty(propertyData);
      setUnits(unitsData);
    } catch (error) {
      console.error("Error fetching property:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      unitName: "",
      unitType: "apartment",
      floor: "",
      bedrooms: "1",
      bathrooms: "1",
      sqm: "",
      rentAmount: "",
      depositAmount: "",
      availableFrom: "",
      occupancyLimit: "1",
      furnished: false,
      amenities: [],
      description: "",
    });
    setEditingUnit(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowUnitModal(true);
  };

  const handleOpenEditModal = (unit) => {
    setEditingUnit(unit);
    setFormData({
      unitName: unit.unitName || "",
      unitType: unit.unitType || "apartment",
      floor: unit.floor || "",
      bedrooms: String(unit.bedrooms || 1),
      bathrooms: String(unit.bathrooms || 1),
      sqm: String(unit.sqm || ""),
      rentAmount: String(unit.rentAmount || ""),
      depositAmount: String(unit.depositAmount || ""),
      availableFrom: unit.availableFrom || "",
      occupancyLimit: String(unit.occupancyLimit || 1),
      furnished: unit.furnished || false,
      amenities: unit.amenities || [],
      description: unit.description || "",
    });
    setShowUnitModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const unitData = {
        unitName: formData.unitName,
        unitType: formData.unitType,
        floor: formData.floor,
        bedrooms: parseInt(formData.bedrooms) || 1,
        bathrooms: parseInt(formData.bathrooms) || 1,
        sqm: parseFloat(formData.sqm) || 0,
        rentAmount: parseFloat(formData.rentAmount) || 0,
        depositAmount: parseFloat(formData.depositAmount) || 0,
        availableFrom: formData.availableFrom,
        occupancyLimit: parseInt(formData.occupancyLimit) || 1,
        furnished: formData.furnished,
        amenities: formData.amenities,
        description: formData.description,
      };

      if (editingUnit) {
        await updateDocument(COLLECTIONS.UNITS, editingUnit.id, unitData);
      } else {
        await createUnit(propertyId, user.uid, unitData);
      }
      
      await fetchPropertyData();
      setShowUnitModal(false);
      resetForm();
    } catch (error) {
      console.error("Error saving unit:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;
    setSaving(true);
    try {
      await deleteDocument(COLLECTIONS.UNITS, deletingUnit.id);
      await fetchPropertyData();
      setShowDeleteModal(false);
      setDeletingUnit(null);
    } catch (error) {
      console.error("Error deleting unit:", error);
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!property) {
    return (
      <EmptyState
        icon={FiHome}
        title="Property not found"
        description="The property you're looking for doesn't exist or you don't have access to it."
        action={<ButtonLink to="/dashboard/properties">Back to Properties</ButtonLink>}
      />
    );
  }

  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  const availableUnits = units.filter((u) => u.status === "available").length;
  const totalRent = units.reduce((sum, u) => sum + (u.rentAmount || 0), 0);
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/dashboard/properties"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to Properties
      </Link>

      {/* Property Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-gray-500">
            <FiMapPin className="h-4 w-4" />
            {property.address}, {property.city} {property.postalCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/dashboard/properties/${propertyId}/edit`)}>
            <FiEdit2 className="h-4 w-4" />
            Edit Property
          </Button>
        </div>
      </div>

      {/* Property Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Units"
          value={units.length}
          icon={FiGrid}
          change={`${availableUnits} available`}
          trend="neutral"
        />
        <StatsCard
          label="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon={FiUsers}
          change={`${occupiedUnits} occupied`}
          trend={occupancyRate >= 80 ? "up" : occupancyRate >= 50 ? "neutral" : "down"}
        />
        <StatsCard
          label="Potential Revenue"
          value={formatCurrency(totalRent)}
          icon={FiDollarSign}
          change="per month"
          trend="neutral"
        />
        <StatsCard
          label="Year Built"
          value={property.yearBuilt || "N/A"}
          icon={FiCalendar}
          change={property.propertyType}
          trend="neutral"
        />
      </div>

      {/* Property Description */}
      {property.description && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600">{property.description}</p>
        </Card>
      )}

      {/* Units Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Units ({units.length})
        </h2>
        <div className="flex gap-2">
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
          <Button className="gap-2" onClick={handleOpenAddModal}>
            <FiPlus className="h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Units Grid/List */}
      {units.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiHome}
            title="No units yet"
            description="Add your first unit to start managing tenants and listings."
            action={
              <Button onClick={handleOpenAddModal} className="gap-2">
                <FiPlus className="h-4 w-4" />
                Add First Unit
              </Button>
            }
          />
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onEdit={() => handleOpenEditModal(unit)}
              onDelete={() => {
                setDeletingUnit(unit);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Rent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{unit.unitName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || unit.unitType}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sqm} m²
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(unit.rentAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusConfig(UNIT_STATUSES, unit.status).color}>
                        {getStatusConfig(UNIT_STATUSES, unit.status).label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(unit)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingUnit(unit);
                            setShowDeleteModal(true);
                          }}
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

      {/* Add/Edit Unit Modal */}
      <Modal
        isOpen={showUnitModal}
        onClose={() => {
          setShowUnitModal(false);
          resetForm();
        }}
        title={editingUnit ? "Edit Unit" : "Add New Unit"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Unit Name *"
              placeholder="e.g., Apt 101, Room A"
              value={formData.unitName}
              onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
              required
            />
            <Select
              label="Unit Type"
              options={UNIT_TYPES}
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
            />
            <Input
              label="Floor"
              placeholder="e.g., Ground, 1st, 2nd"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
            />
            <Input
              label="Size (m²)"
              type="number"
              min="0"
              value={formData.sqm}
              onChange={(e) => setFormData({ ...formData, sqm: e.target.value })}
            />
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
            />
            <Input
              label="Available From"
              type="date"
              value={formData.availableFrom}
              onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
            />
            <Input
              label="Max Occupancy"
              type="number"
              min="1"
              value={formData.occupancyLimit}
              onChange={(e) => setFormData({ ...formData, occupancyLimit: e.target.value })}
            />
          </div>

          <Checkbox
            label="Furnished"
            checked={formData.furnished}
            onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.slice(0, 12).map((amenity) => (
                <button
                  key={amenity.value}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity.value)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    formData.amenities.includes(amenity.value)
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {amenity.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details about this unit..."
          />

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowUnitModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingUnit ? "Update Unit" : "Add Unit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingUnit(null);
        }}
        title="Delete Unit"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{deletingUnit?.unitName}</strong>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingUnit(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>
            Delete Unit
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UnitCard({ unit, onEdit, onDelete }) {
  const statusConfig = getStatusConfig(UNIT_STATUSES, unit.status);

  return (
    <Card className="relative">
      <div className="absolute right-3 top-3 flex gap-1">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <FiEdit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FiHome className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{unit.unitName}</h3>
          <p className="text-sm text-gray-500">
            {UNIT_TYPES.find((t) => t.value === unit.unitType)?.label || unit.unitType}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{unit.bedrooms}</p>
          <p className="text-xs text-gray-500">Beds</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{unit.bathrooms}</p>
          <p className="text-xs text-gray-500">Baths</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{unit.sqm || "—"}</p>
          <p className="text-xs text-gray-500">m²</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-lg font-bold text-primary">
          {formatCurrency(unit.rentAmount)}
          <span className="text-sm font-normal text-gray-500">/mo</span>
        </p>
        <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
      </div>

      {unit.furnished && (
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            Furnished
          </span>
        </div>
      )}
    </Card>
  );
}
