import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getPublicBrowseLink,
  createBrowseLinkApplication,
} from "../../lib/firestore";
import {
  Card,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Textarea,
  Alert,
} from "../../components/ui";
import { FiHome, FiMapPin, FiKey } from "react-icons/fi";

export default function BrowseLink() {
  const { slug } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyItem, setApplyItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    desiredMoveIn: "",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getPublicBrowseLink(slug);
        if (!cancelled) {
          setLink(data);
          if (!data) setError("This browse link is missing or has been turned off.");
        }
      } catch (err) {
        if (!cancelled) {
          setLink(null);
          setError(err.message || "Could not open this link");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (userProfile) {
      setForm((p) => ({
        ...p,
        applicantName: p.applicantName || userProfile.displayName || "",
        applicantEmail: p.applicantEmail || userProfile.email || user?.email || "",
        applicantPhone: p.applicantPhone || userProfile.phone || "",
      }));
    }
  }, [userProfile, user]);

  const openApply = (item) => {
    setSuccess("");
    setError("");
    if (!user) {
      navigate(`/login?redirect=/browse/${slug}`);
      return;
    }
    if (userProfile?.role && userProfile.role !== "renter") {
      setError("Sign in with a renter account to apply from this link.");
      return;
    }
    setApplyItem(item);
  };

  const submitApply = async (e) => {
    e.preventDefault();
    if (!applyItem || !user) return;
    setSaving(true);
    setError("");
    try {
      await createBrowseLinkApplication(user.uid, slug, applyItem, form);
      setApplyItem(null);
      setSuccess("Application sent — the mediation desk will follow up.");
    } catch (err) {
      setError(err.message || "Could not submit application");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={FiKey}
          title="Link unavailable"
          description={error || "Ask your manager for an updated browse link."}
          action={<ButtonLink to="/">Back home</ButtonLink>}
        />
      </div>
    );
  }

  const items = link.items || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8C00]">
          Shared room list
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium text-[#2C1810] sm:text-4xl">
          {link.title}
        </h1>
        {link.description && (
          <p className="mt-3 text-[#2C1810]/60">{link.description}</p>
        )}
        <p className="mt-2 text-sm text-[#2C1810]/45">
          Private link — not listed on the public website.
        </p>
      </div>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}
      {success && <Alert variant="success" className="mb-6">{success}</Alert>}

      {items.length === 0 ? (
        <EmptyState
          icon={FiHome}
          title="No rooms on this link"
          description="The manager may refresh or update this list soon."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={`${item.bedId || item.roomId}`} className="flex flex-col overflow-hidden p-0">
              <div className="flex h-28 items-center justify-center bg-[#2C1810]/05 sm:h-40">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FiHome className="h-10 w-10 text-[#2C1810]/25" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold leading-tight text-[#2C1810] sm:text-base">
                    {item.roomLabel}
                    {item.bedLabel ? ` · ${item.bedLabel}` : ""}
                  </h2>
                  {item.monthlyRent != null && (
                    <Badge variant="success">€{item.monthlyRent}/mo</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-[#2C1810]/70">
                  {item.propertyName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm text-[#2C1810]/45">
                  <FiMapPin className="h-3.5 w-3.5" />
                  {[item.city, item.area].filter(Boolean).join(", ") || "—"}
                </p>
                {item.roomType && (
                  <p className="mt-2 text-xs uppercase tracking-wide text-[#2C1810]/40">
                    {String(item.roomType).replace(/_/g, " ")}
                  </p>
                )}
                {item.roomDescription && (
                  <p className="mt-2 line-clamp-3 text-sm text-[#2C1810]/55">
                    {item.roomDescription}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <Button className="w-full" onClick={() => openApply(item)}>
                    {user ? "Apply" : "Sign in to apply"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-sm text-[#2C1810]/40">
        Already applied?{" "}
        <Link to="/login" className="font-medium text-[#2C1810] underline-offset-2 hover:underline">
          Sign in
        </Link>{" "}
        to track status in My Home.
      </p>

      <Modal
        isOpen={!!applyItem}
        onClose={() => setApplyItem(null)}
        title="Apply for this room"
      >
        {applyItem && (
          <form onSubmit={submitApply} className="space-y-4">
            <p className="text-sm text-gray-600">
              {applyItem.propertyName} · {applyItem.roomLabel}
              {applyItem.bedLabel ? ` · ${applyItem.bedLabel}` : ""}
            </p>
            <Input
              label="Full name"
              required
              value={form.applicantName}
              onChange={(e) => setForm((p) => ({ ...p, applicantName: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.applicantEmail}
              onChange={(e) => setForm((p) => ({ ...p, applicantEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.applicantPhone}
              onChange={(e) => setForm((p) => ({ ...p, applicantPhone: e.target.value }))}
            />
            <Input
              label="Desired move-in"
              type="date"
              value={form.desiredMoveIn}
              onChange={(e) => setForm((p) => ({ ...p, desiredMoveIn: e.target.value }))}
            />
            <Textarea
              label="Message"
              rows={3}
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Tell the desk a bit about your stay…"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setApplyItem(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Submit application
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
