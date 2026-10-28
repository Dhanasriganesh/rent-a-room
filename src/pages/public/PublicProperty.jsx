import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, createPublicEnquiry, queryDocuments } from "../../lib/firestore";
import { assertClientRateLimit, RATE_LIMITS } from "../../lib/rateLimit";
import { Alert, Button, Card, Input, Spinner, Textarea } from "../../components/ui";
import { FiArrowLeft, FiHome, FiMapPin } from "react-icons/fi";

export default function PublicProperty() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [fromRent, setFromRent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    desiredMoveIn: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMissing(false);
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.PROPERTIES, id));
        if (!snap.exists() || snap.data().status !== "active") {
          if (!cancelled) setMissing(true);
          return;
        }
        if (!cancelled) setProperty({ id: snap.id, ...snap.data() });
        const offers = await queryDocuments(
          COLLECTIONS.RENTAL_OFFERS,
          [
            { field: "propertyId", operator: "==", value: id },
            { field: "status", operator: "==", value: "active" },
          ],
          null,
          20
        ).catch(() => []);
        const amounts = offers
          .map((o) => Number(o.monthlyRent))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (!cancelled && amounts.length) setFromRent(Math.min(...amounts));
      } catch (err) {
        console.error(err);
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      assertClientRateLimit("apply", {
        ...RATE_LIMITS.apply,
        identity: form.applicantEmail || "anon",
      });
      await createPublicEnquiry({
        propertyId: id,
        ...form,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not send enquiry");
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

  if (missing || !property) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-serif text-3xl text-[#2C1810]">Property not listed</h1>
        <p className="mt-3 text-sm text-[#2C1810]/60">
          This property is not on the public catalogue.
        </p>
        <Link to="/properties" className="mt-6 inline-block text-sm font-medium text-[#FF8C00]">
          Back to properties
        </Link>
      </div>
    );
  }

  const available = Number(property.availableBeds) || 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/properties"
        className="inline-flex items-center gap-1 text-sm text-[#2C1810]/60 hover:text-[#2C1810]"
      >
        <FiArrowLeft className="h-4 w-4" />
        All properties
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="overflow-hidden rounded-[1.5rem] bg-[#2C1810]/5">
            {property.images?.[0] ? (
              <img
                src={property.images[0]}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center">
                <FiHome className="h-12 w-12 text-[#2C1810]/25" />
              </div>
            )}
          </div>
          <h1 className="mt-6 font-serif text-3xl text-[#2C1810] sm:text-4xl">
            {property.name}
          </h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-[#2C1810]/60">
            <FiMapPin className="h-4 w-4" />
            {[property.address, property.city, property.postalCode].filter(Boolean).join(", ") ||
              "Germany"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {property.propertyType && (
              <span className="rounded-full bg-white/70 px-3 py-1 capitalize text-[#2C1810]/70">
                {String(property.propertyType).replaceAll("_", " ")}
              </span>
            )}
            <span className="rounded-full bg-white/70 px-3 py-1 text-[#2C1810]/70">
              {available > 0 ? `${available} bed${available === 1 ? "" : "s"} available` : "Ask about availability"}
            </span>
            {fromRent != null && (
              <span className="rounded-full bg-[#FF8C00]/15 px-3 py-1 font-medium text-[#2C1810]">
                From €{Math.round(fromRent)} / month
              </span>
            )}
          </div>
          {property.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-[#2C1810]/70">
              {property.description}
            </p>
          )}
          {property.houseRules && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2C1810]/45">
                House notes
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#2C1810]/70">
                {property.houseRules}
              </p>
            </div>
          )}
        </div>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-[#2C1810]">Enquire</h2>
          <p className="mt-1 text-sm text-[#2C1810]/55">
            No account needed. If the desk accepts you, they email a login.
          </p>
          {done ? (
            <Alert variant="success" className="mt-4">
              Enquiry sent. The desk will reply to {form.applicantEmail}. You can sign in
              only after they send your credentials.
            </Alert>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              <Input
                label="Your name"
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
                rows={4}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                hint="Say who the room is for and how long you want to stay."
              />
              <Button type="submit" loading={saving} className="w-full !bg-[#2C1810]">
                Send enquiry
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
