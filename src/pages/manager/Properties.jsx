import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllProperties,
  getAllOwners,
  createProperty,
  updateDocument,
  COLLECTIONS,
  migrateAllUnitsForProperty,
} from "../../lib/firestore";
import { PROPERTY_TYPES, CITIES } from "../../lib/constants";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  StatusBadge,
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import { FiPlus, FiHome, FiMapPin, FiLayers } from "react-icons/fi";

export default function ManagerProperties() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const filterOwnerRecordId = searchParams.get("ownerRecordId") || "";

  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [migratingId, setMigratingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Germany",
    propertyType: "apartment_building",
    description: "",
    houseRules: "",
    ownerRecordId: filterOwnerRecordId,
    status: "active",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [props, ownerRows] = await Promise.all([getAllProperties(), getAllOwners()]);
      setOwners(ownerRows);
      setProperties(
        filterOwnerRecordId
          ? props.filter((p) => p.ownerRecordId === filterOwnerRecordId)
          : props
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterOwnerRecordId]);

  const ownerName = (id) => owners.find((o) => o.id === id)?.fullName || "—";

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Germany",
      propertyType: "apartment_building",
      description: "",
      houseRules: "",
      ownerRecordId: filterOwnerRecordId,
      status: "active",
    });
    setModalOpen(true);
  };

  const openEdit = (property) => {
    setEditing(property);
    setForm({
      name: property.name || "",
      address: property.address || "",
      city: property.city || "",
      postalCode: property.postalCode || "",
      country: property.country || "Germany",
      propertyType: property.propertyType || "apartment_building",
      description: property.description || "",
      houseRules: property.houseRules || "",
      ownerRecordId: property.ownerRecordId || "",
      status: property.status || "active",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const owner = owners.find((o) => o.id === form.ownerRecordId);
      const payload = {
        name: form.name,
        address: form.address,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country,
        propertyType: form.propertyType,
        description: form.description,
        houseRules: form.houseRules,
        ownerRecordId: form.ownerRecordId || null,
        ownerId: owner?.linkedUserId || null,
        status: form.status,
        createdBy: user.uid,
      };

      if (editing) {
        await updateDocument(COLLECTIONS.PROPERTIES, editing.id, payload);
      } else {
        await createProperty(payload.ownerId, payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runMigration = async (propertyId) => {
    if (
      !confirm(
        "Migrate legacy units for this property into rooms/beds? Safe to re-run (skips already migrated)."
      )
    ) {
      return;
    }
    setMigratingId(propertyId);
    setMessage("");
    try {
      const results = await migrateAllUnitsForProperty(propertyId, user.uid);
      const migrated = results.filter((r) => !r.skipped).length;
      const skipped = results.filter((r) => r.skipped).length;
      const review = results.filter((r) => r.needsManualReview).length;
      setMessage(
        `Migration done: ${migrated} created, ${skipped} skipped, ${review} flagged for manual review.`
      );
      await load();
    } catch (err) {
      setError(err.message || "Migration failed");
    } finally {
      setMigratingId(null);
    }
  };

  const visibleProperties = properties.filter((p) =>
    matchesQuery(
      search,
      p.name,
      p.address,
      p.city,
      p.postalCode,
      p.status,
      p.propertyType,
      ownerName(p.ownerRecordId)
    )
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Company-wide property portfolio"
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <FiPlus /> Add property
          </Button>
        }
      />

      {filterOwnerRecordId && (
        <Alert variant="info">
          Filtered by owner record.{" "}
          <Link to="/manager/properties" className="underline">
            Clear filter
          </Link>
        </Alert>
      )}
      {message && <Alert variant="success">{message}</Alert>}
      {error && !modalOpen && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search name, city, or address" />

      {properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiHome}
            title="No properties yet"
            description="Add a property and link it to an owner record."
            action={<Button onClick={openCreate}>Add property</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleProperties.length === 0 ? (
            <p className="text-sm text-gray-500">No properties match that search.</p>
          ) : visibleProperties.map((p) => (
            <Card key={p.id} className="!p-3 sm:!p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                    <FiMapPin className="h-4 w-4" />
                    {p.address}, {p.city}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Owner: {ownerName(p.ownerRecordId)} · Rooms {p.totalRooms || 0} · Beds{" "}
                    {p.totalBeds || 0} · Available {p.availableBeds || 0}
                    {p.totalUnits != null ? ` · Legacy units ${p.totalUnits}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Link
                    to={`/manager/inventory?propertyId=${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
                  >
                    <FiLayers /> Rooms & beds
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={migratingId === p.id}
                    onClick={() => runMigration(p.id)}
                  >
                    Migrate units
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit property" : "Add property"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Select
            label="Owner record"
            required
            value={form.ownerRecordId}
            onChange={(e) => setForm((p) => ({ ...p, ownerRecordId: e.target.value }))}
            options={owners.map((o) => ({ value: o.id, label: o.fullName }))}
            placeholder="Select owner"
          />
          <Input
            label="Property name"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Street address"
            required
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="City"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              options={CITIES.map((c) => ({ value: c, label: c }))}
              required
            />
            <Input
              label="Postal code"
              value={form.postalCode}
              onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Property type"
              value={form.propertyType}
              onChange={(e) => setForm((p) => ({ ...p, propertyType: e.target.value }))}
              options={PROPERTY_TYPES}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              options={[
                { value: "draft", label: "Draft" },
                { value: "pending_review", label: "Pending review" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Textarea
            label="House rules"
            rows={2}
            value={form.houseRules}
            onChange={(e) => setForm((p) => ({ ...p, houseRules: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
