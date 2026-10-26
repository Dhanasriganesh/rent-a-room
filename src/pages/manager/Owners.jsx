import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  createOwnerRecord,
  getAllOwners,
  updateOwnerRecord,
  getPropertiesByOwnerRecord,
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
import { FiPlus, FiUsers, FiEdit2, FiHome } from "react-icons/fi";

export default function ManagerOwners() {
  const { user } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    legalName: "",
    contactEmail: "",
    phoneNumber: "",
    address: "",
    preferredContactChannel: "email",
    notes: "",
    status: "active",
    linkedUserId: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getAllOwners();
      const withCounts = await Promise.all(
        rows.map(async (o) => {
          const props = await getPropertiesByOwnerRecord(o.id);
          return { ...o, propertyCount: props.length };
        })
      );
      setOwners(withCounts);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load owners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: "",
      legalName: "",
      contactEmail: "",
      phoneNumber: "",
      address: "",
      preferredContactChannel: "email",
      notes: "",
      status: "active",
      linkedUserId: "",
    });
    setModalOpen(true);
  };

  const openEdit = (owner) => {
    setEditing(owner);
    setForm({
      fullName: owner.fullName || "",
      legalName: owner.legalName || "",
      contactEmail: owner.contactEmail || "",
      phoneNumber: owner.phoneNumber || "",
      address: owner.address || "",
      preferredContactChannel: owner.preferredContactChannel || "email",
      notes: owner.notes || "",
      status: owner.status || "active",
      linkedUserId: owner.linkedUserId || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        linkedUserId: form.linkedUserId.trim() || null,
      };
      if (editing) {
        await updateOwnerRecord(editing.id, payload, user.uid);
      } else {
        await createOwnerRecord(payload, user.uid);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
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
      <PageHeader
        title="Owners"
        subtitle="Property owner records managed by staff"
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <FiPlus /> Add owner
          </Button>
        }
      />

      {error && !modalOpen && <Alert variant="error">{error}</Alert>}

      {owners.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiUsers}
            title="No owners yet"
            description="Create an owner record, then attach properties to them."
            action={<Button onClick={openCreate}>Add owner</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {owners.map((owner) => (
            <Card key={owner.id} className="!p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{owner.fullName}</h3>
                    <Badge variant={owner.status === "active" ? "success" : "default"}>
                      {owner.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {owner.contactEmail}
                    {owner.phoneNumber ? ` · ${owner.phoneNumber}` : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                    <FiHome className="h-4 w-4" />
                    {owner.propertyCount} propert{owner.propertyCount === 1 ? "y" : "ies"}
                    {owner.linkedUserId ? ` · linked user ${owner.linkedUserId.slice(0, 8)}…` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(owner)}>
                    <FiEdit2 /> Edit
                  </Button>
                  <Link
                    to={`/manager/properties?ownerRecordId=${owner.id}`}
                    className="inline-flex items-center rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Properties
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit owner" : "Add owner"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            />
            <Input
              label="Legal name"
              value={form.legalName}
              onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
            />
            <Input
              label="Contact email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phoneNumber}
              onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
            />
            <Select
              label="Preferred contact"
              value={form.preferredContactChannel}
              onChange={(e) =>
                setForm((p) => ({ ...p, preferredContactChannel: e.target.value }))
              }
              options={[
                { value: "email", label: "Email" },
                { value: "phone", label: "Phone" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <Input
            label="Linked Firebase user ID (optional)"
            value={form.linkedUserId}
            onChange={(e) => setForm((p) => ({ ...p, linkedUserId: e.target.value }))}
            hint="If this owner has an owner-role login, paste their Auth UID"
          />
          <Textarea
            label="Internal notes (staff only)"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
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
