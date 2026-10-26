import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  listBrowseLinks,
  createBrowseLink,
  updateBrowseLink,
  deleteBrowseLink,
  getAllProperties,
  getPropertyInventory,
  getOffersForBed,
} from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Button,
  ButtonLink,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Textarea,
  Alert,
  Badge,
  Select,
} from "../../components/ui";
import { FiLink, FiCopy, FiPlus, FiRefreshCw, FiTrash2, FiExternalLink } from "react-icons/fi";

export default function ManagerShareLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busySlug, setBusySlug] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyId: "",
    bedIds: [],
  });
  const [beds, setBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, props] = await Promise.all([listBrowseLinks(), getAllProperties()]);
      setLinks(rows);
      setProperties(props);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load share links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.propertyId) {
      setBeds([]);
      setForm((p) => ({ ...p, bedIds: [] }));
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBeds(true);
      try {
        const inv = await getPropertyInventory(form.propertyId);
        const rows = [];
        for (const room of inv.rooms || []) {
          for (const bed of room.beds || []) {
            if (bed.status !== "available") continue;
            const offers = await getOffersForBed(bed.id);
            rows.push({
              id: bed.id,
              label: `${room.label || "Room"} · ${bed.label || "Bed"}`,
              roomType: room.roomType,
              rent: offers[0]?.monthlyRent ?? null,
            });
          }
        }
        if (!cancelled) {
          setBeds(rows);
          setForm((p) => ({ ...p, bedIds: [] }));
        }
      } catch (err) {
        if (!cancelled) {
          setBeds([]);
          setError(err.message || "Could not load rooms");
        }
      } finally {
        if (!cancelled) setLoadingBeds(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.propertyId]);

  const propertyOptions = useMemo(
    () => [
      { value: "", label: "Select property…" },
      ...properties.map((p) => ({
        value: p.id,
        label: `${p.name || "Property"}${p.city ? ` · ${p.city}` : ""}`,
      })),
    ],
    [properties]
  );

  const openCreate = () => {
    setForm({ title: "", description: "", propertyId: "", bedIds: [] });
    setBeds([]);
    setModalOpen(true);
  };

  const toggleBed = (bedId) => {
    setForm((p) => ({
      ...p,
      bedIds: p.bedIds.includes(bedId)
        ? p.bedIds.filter((id) => id !== bedId)
        : [...p.bedIds, bedId],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!form.propertyId) throw new Error("Choose a property");
      const slug = await createBrowseLink(
        {
          title: form.title || "Available rooms",
          description: form.description,
          propertyIds: [form.propertyId],
          bedIds: form.bedIds.length ? form.bedIds : undefined,
        },
        user.uid
      );
      setModalOpen(false);
      setMessage(`Link created — /browse/${slug}`);
      await load();
    } catch (err) {
      setError(err.message || "Could not create link");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (slug) => {
    const url = `${origin}/browse/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setError("Could not copy — select the URL manually");
    }
  };

  const refreshLink = async (slug) => {
    setBusySlug(slug);
    setError("");
    try {
      await updateBrowseLink(slug, { refreshItems: true }, user.uid);
      setMessage("Room list refreshed from inventory");
      await load();
    } catch (err) {
      setError(err.message || "Refresh failed");
    } finally {
      setBusySlug("");
    }
  };

  const toggleStatus = async (link) => {
    setBusySlug(link.id || link.slug);
    setError("");
    try {
      const next = link.status === "active" ? "inactive" : "active";
      await updateBrowseLink(link.id || link.slug, { status: next }, user.uid);
      setMessage(
        next === "active"
          ? "Link is live again"
          : "Link deactivated — URL no longer shows rooms"
      );
      await load();
    } catch (err) {
      setError(err.message || "Could not update status");
    } finally {
      setBusySlug("");
    }
  };

  const removeLink = async (slug) => {
    if (!window.confirm("Delete this browse link? Anyone with the URL will lose access.")) {
      return;
    }
    setBusySlug(slug);
    setError("");
    try {
      await deleteBrowseLink(slug, user.uid);
      setMessage("Link deleted");
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setBusySlug("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Share links"
        subtitle="Create private browse-room URLs to send to applicants. They do not appear in the public website menu."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <FiPlus className="h-4 w-4" />
            New share link
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={FiLink}
          title="No share links yet"
          description="Pick a property (and optional beds), then copy a private /browse/… link to share with renters."
          action={
            <Button onClick={openCreate} className="gap-2">
              <FiPlus className="h-4 w-4" />
              Create first link
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const slug = link.id || link.slug;
            const url = `${origin}/browse/${slug}`;
            const busy = busySlug === slug;
            return (
              <Card key={slug}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{link.title}</h3>
                      <Badge variant={link.status === "active" ? "success" : "default"}>
                        {link.status === "active" ? "Live" : "Off"}
                      </Badge>
                    </div>
                    {link.description && (
                      <p className="mt-1 text-sm text-gray-600">{link.description}</p>
                    )}
                    <p className="mt-2 break-all font-mono text-xs text-primary">{url}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {(link.items || []).length} room
                      {(link.items || []).length === 1 ? "" : "s"} on link ·{" "}
                      {(link.propertyIds || []).length} propert
                      {(link.propertyIds || []).length === 1 ? "y" : "ies"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => copyUrl(slug)}
                    >
                      <FiCopy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <ButtonLink
                      to={`/browse/${slug}`}
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" />
                      Open
                    </ButtonLink>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      loading={busy}
                      onClick={() => refreshLink(slug)}
                    >
                      <FiRefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy}
                      onClick={() => toggleStatus(link)}
                    >
                      {link.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      loading={busy}
                      onClick={() => removeLink(slug)}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New browse share link"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Berlin Mitte — March openings"
            required
          />
          <Textarea
            label="Short note (optional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Shown at the top of the shared page"
          />
          <Select
            label="Property"
            options={propertyOptions}
            value={form.propertyId}
            onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value }))}
            required
          />

          {form.propertyId && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Rooms to include</p>
              <p className="mb-3 text-xs text-gray-500">
                Leave all unchecked to include every available bed. These rooms stay off
                the public site — only this link shows them.
              </p>
              {loadingBeds ? (
                <Spinner />
              ) : beds.length === 0 ? (
                <p className="text-sm text-gray-500">No available beds on this property.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {beds.map((bed) => (
                    <li key={bed.id}>
                      <label className="flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.bedIds.includes(bed.id)}
                          onChange={() => toggleBed(bed.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1 text-gray-800">{bed.label}</span>
                        {bed.rent != null && (
                          <span className="text-xs text-gray-500">€{bed.rent}/mo</span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
