import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllProperties,
  getPropertyInventory,
  createRoom,
  createBed,
  updateBed,
  createRentalOffer,
  getOffersForBed,
  updateDocument,
  COLLECTIONS,
  ROOM_TYPES,
  BED_STATUSES,
  migrateAllUnitsForProperty,
} from "../../lib/firestore";
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
} from "../../components/ui";
import { FiPlus, FiLayers, FiHome } from "react-icons/fi";

const bedBadge = (status) => {
  if (status === "available") return "success";
  if (status === "occupied" || status === "reserved") return "warning";
  if (status === "blocked" || status === "maintenance") return "danger";
  return "default";
};

export default function ManagerInventory() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyId = searchParams.get("propertyId") || "";

  const [properties, setProperties] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [roomModal, setRoomModal] = useState(false);
  const [bedModal, setBedModal] = useState(null); // roomId
  const [offerModal, setOfferModal] = useState(null); // bed
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const [roomForm, setRoomForm] = useState({
    label: "",
    roomType: "private",
    capacity: 1,
    description: "",
    notes: "",
    status: "active",
  });
  const [bedForm, setBedForm] = useState({ label: "Bed 1", status: "available", notes: "" });
  const [offerForm, setOfferForm] = useState({
    monthlyRent: "",
    depositAmount: "",
    depositMeaning: "security_deposit",
    currency: "EUR",
    availableFrom: "",
  });
  const [activeOffers, setActiveOffers] = useState({});

  const loadProperties = async () => {
    const rows = await getAllProperties();
    setProperties(rows);
    if (!propertyId && rows[0]) {
      setSearchParams({ propertyId: rows[0].id });
    }
  };

  const loadInventory = async (id) => {
    if (!id) {
      setInventory(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getPropertyInventory(id);
      setInventory(data);
      const offersMap = {};
      for (const bed of data.beds || []) {
        const offers = await getOffersForBed(bed.id);
        if (offers[0]) offersMap[bed.id] = offers[0];
      }
      setActiveOffers(offersMap);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadInventory(propertyId);
  }, [propertyId]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createRoom(propertyId, roomForm, user.uid);
      setRoomModal(false);
      setRoomForm({
        label: "",
        roomType: "private",
        capacity: 1,
        description: "",
        notes: "",
        status: "active",
      });
      await loadInventory(propertyId);
      await loadProperties();
    } catch (err) {
      setError(err.message || "Could not create room");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBed = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createBed(bedModal, bedForm, user.uid);
      setBedModal(null);
      setBedForm({ label: "Bed 1", status: "available", notes: "" });
      await loadInventory(propertyId);
      await loadProperties();
    } catch (err) {
      setError(err.message || "Could not create bed");
    } finally {
      setSaving(false);
    }
  };

  const handleBedStatus = async (bedId, status) => {
    try {
      await updateBed(bedId, { status }, user.uid);
      await loadInventory(propertyId);
      await loadProperties();
    } catch (err) {
      setError(err.message || "Could not update bed");
    }
  };

  const openOffer = (bed) => {
    const existing = activeOffers[bed.id];
    setOfferModal(bed);
    setOfferForm({
      monthlyRent: existing?.monthlyRent ?? "",
      depositAmount: existing?.depositAmount ?? "",
      depositMeaning: existing?.depositMeaning || "security_deposit",
      currency: existing?.currency || "EUR",
      availableFrom: existing?.availableFrom
        ? String(existing.availableFrom).slice(0, 10)
        : "",
    });
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!offerModal) return;
    setSaving(true);
    setError("");
    try {
      const existing = activeOffers[offerModal.id];
      if (existing) {
        await updateDocument(COLLECTIONS.RENTAL_OFFERS, existing.id, { status: "superseded" });
      }
      await createRentalOffer(
        {
          propertyId,
          roomId: offerModal.roomId,
          bedId: offerModal.id,
          legacyUnitId: offerModal.legacyUnitId || null,
          monthlyRent: offerForm.monthlyRent,
          depositAmount: offerForm.depositAmount,
          depositMeaning: offerForm.depositMeaning,
          currency: offerForm.currency,
          availableFrom: offerForm.availableFrom || null,
        },
        user.uid
      );
      setOfferModal(null);
      await loadInventory(propertyId);
    } catch (err) {
      setError(err.message || "Could not save pricing");
    } finally {
      setSaving(false);
    }
  };

  const runMigration = async () => {
    if (
      !confirm(
        "Migrate legacy units into rooms/beds for this property? Already-migrated units are skipped."
      )
    ) {
      return;
    }
    setMigrating(true);
    setMessage("");
    try {
      const results = await migrateAllUnitsForProperty(propertyId, user.uid);
      const migrated = results.filter((r) => !r.skipped).length;
      const skipped = results.filter((r) => r.skipped).length;
      setMessage(`Migration: ${migrated} created, ${skipped} skipped.`);
      await loadInventory(propertyId);
      await loadProperties();
    } catch (err) {
      setError(err.message || "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & Beds"
        subtitle="Physical inventory for allocation (units remain authoritative for listings)"
        actions={
          propertyId ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" loading={migrating} onClick={runMigration}>
                Migrate units
              </Button>
              <Button
                className="gap-2"
                onClick={() => setRoomModal(true)}
              >
                <FiPlus /> Add room
              </Button>
            </div>
          ) : null
        }
      />

      <Card className="!p-4">
        <Select
          label="Property"
          value={propertyId}
          onChange={(e) => {
            const id = e.target.value;
            if (id) setSearchParams({ propertyId: id });
            else setSearchParams({});
          }}
          options={properties.map((p) => ({
            value: p.id,
            label: `${p.name} — ${p.city || ""}`,
          }))}
          placeholder="Select a property"
        />
        {!properties.length && (
          <p className="mt-2 text-sm text-gray-500">
            No properties yet.{" "}
            <Link to="/manager/properties" className="text-primary underline">
              Add a property
            </Link>{" "}
            first.
          </p>
        )}
      </Card>

      {message && <Alert variant="success">{message}</Alert>}
      {error && !roomModal && !bedModal && !offerModal && (
        <Alert variant="error">{error}</Alert>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !propertyId ? (
        <Card>
          <EmptyState
            icon={FiHome}
            title="Select a property"
            description="Choose a property above to manage rooms and beds."
          />
        </Card>
      ) : !inventory?.rooms?.length ? (
        <Card>
          <EmptyState
            icon={FiLayers}
            title="No rooms yet"
            description={
              inventory?.units?.length
                ? `${inventory.units.length} legacy unit(s) found — migrate them or add rooms manually.`
                : "Add a room, then create beds under it."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {inventory?.units?.length > 0 && (
                  <Button variant="outline" loading={migrating} onClick={runMigration}>
                    Migrate units
                  </Button>
                )}
                <Button onClick={() => setRoomModal(true)}>Add room</Button>
              </div>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {inventory.rooms.map((room) => (
            <Card key={room.id} className="!p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{room.label}</h3>
                    <Badge>{room.roomType}</Badge>
                    <Badge variant={room.status === "active" ? "success" : "default"}>
                      {room.status}
                    </Badge>
                    {room.legacyUnitId && (
                      <Badge variant="info">from unit</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Capacity {room.capacity}
                    {room.notes ? ` · ${room.notes}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    setBedModal(room.id);
                    setBedForm({
                      label: `Bed ${(room.beds?.length || 0) + 1}`,
                      status: "available",
                      notes: "",
                    });
                  }}
                >
                  <FiPlus /> Add bed
                </Button>
              </div>

              {!room.beds?.length ? (
                <p className="text-sm text-gray-500">No beds in this room yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {room.beds.map((bed) => {
                    const offer = activeOffers[bed.id];
                    return (
                      <li
                        key={bed.id}
                        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900">{bed.label}</span>
                            <Badge variant={bedBadge(bed.status)}>{bed.status}</Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {offer
                              ? `€${Number(offer.monthlyRent).toLocaleString()}/mo · deposit €${Number(
                                  offer.depositAmount
                                ).toLocaleString()}`
                              : "No active pricing offer"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={bed.status}
                            onChange={(e) => handleBedStatus(bed.id, e.target.value)}
                            options={BED_STATUSES}
                            className="!w-40"
                          />
                          <Button size="sm" variant="outline" onClick={() => openOffer(bed)}>
                            Pricing
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ))}

          {inventory.units?.length > 0 && (
            <Card className="!p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Legacy units</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {inventory.units.map((u) => (
                  <li key={u.id}>
                    {u.unitName || u.id} · {u.unitType} · {u.status}
                    {u.inventoryMigrated ? " · migrated" : " · not migrated"}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Modal isOpen={roomModal} onClose={() => setRoomModal(false)} title="Add room" size="lg">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Room label"
            required
            value={roomForm.label}
            onChange={(e) => setRoomForm((p) => ({ ...p, label: e.target.value }))}
            placeholder="e.g. Room 2A"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Room type"
              value={roomForm.roomType}
              onChange={(e) => setRoomForm((p) => ({ ...p, roomType: e.target.value }))}
              options={ROOM_TYPES}
            />
            <Input
              label="Capacity (beds)"
              type="number"
              min={1}
              value={roomForm.capacity}
              onChange={(e) =>
                setRoomForm((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))
              }
            />
          </div>
          <Textarea
            label="Description"
            rows={2}
            value={roomForm.description}
            onChange={(e) => setRoomForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Textarea
            label="Staff notes"
            rows={2}
            value={roomForm.notes}
            onChange={(e) => setRoomForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRoomModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create room
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!bedModal}
        onClose={() => setBedModal(null)}
        title="Add bed"
        size="md"
      >
        <form onSubmit={handleCreateBed} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Bed label"
            required
            value={bedForm.label}
            onChange={(e) => setBedForm((p) => ({ ...p, label: e.target.value }))}
          />
          <Select
            label="Status"
            value={bedForm.status}
            onChange={(e) => setBedForm((p) => ({ ...p, status: e.target.value }))}
            options={BED_STATUSES}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={bedForm.notes}
            onChange={(e) => setBedForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setBedModal(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create bed
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!offerModal}
        onClose={() => setOfferModal(null)}
        title={`Pricing — ${offerModal?.label || ""}`}
        size="md"
      >
        <form onSubmit={handleSaveOffer} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Monthly rent (€)"
            type="number"
            min={0}
            step="0.01"
            required
            value={offerForm.monthlyRent}
            onChange={(e) => setOfferForm((p) => ({ ...p, monthlyRent: e.target.value }))}
          />
          <Input
            label="Deposit (€)"
            type="number"
            min={0}
            step="0.01"
            value={offerForm.depositAmount}
            onChange={(e) => setOfferForm((p) => ({ ...p, depositAmount: e.target.value }))}
          />
          <Select
            label="Deposit meaning"
            value={offerForm.depositMeaning}
            onChange={(e) => setOfferForm((p) => ({ ...p, depositMeaning: e.target.value }))}
            options={[
              { value: "security_deposit", label: "Security deposit" },
              { value: "advance_rent", label: "Advance rent" },
              { value: "other", label: "Other" },
            ]}
          />
          <Input
            label="Available from"
            type="date"
            value={offerForm.availableFrom}
            onChange={(e) => setOfferForm((p) => ({ ...p, availableFrom: e.target.value }))}
          />
          <p className="text-xs text-gray-500">
            Saving creates a new active offer and supersedes the previous one.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOfferModal(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save pricing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
