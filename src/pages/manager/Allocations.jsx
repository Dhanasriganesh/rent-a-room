import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllAllocations,
  getAllApplications,
  getAllProperties,
  getPropertyInventory,
  getOffersForBed,
  allocateBedAtomically,
  cancelAllocation,
  provisionRenterAccountWithCredentials,
} from "../../lib/firestore";
import { ALLOCATION_STATUSES } from "../../lib/constants";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  Spinner,
  Modal,
  Input,
  Select,
  Alert,
  Badge,
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import { FiKey } from "react-icons/fi";

const allocLabel = (v) =>
  ALLOCATION_STATUSES.find((s) => s.value === v)?.label || v;

export default function ManagerAllocations() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const applicationId = searchParams.get("applicationId") || "";
  const highlight = searchParams.get("highlight") || "";

  const [allocations, setAllocations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [properties, setProperties] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(Boolean(applicationId));
  const [saving, setSaving] = useState(false);
  const [invitingId, setInvitingId] = useState("");
  const [credsResult, setCredsResult] = useState(null);

  const [form, setForm] = useState({
    applicationId,
    propertyId: "",
    roomId: "",
    bedId: "",
    startDate: "",
    plannedEndDate: "",
    agreedMonthlyRent: "",
    agreedDeposit: "",
    currency: "EUR",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [allocs, apps, props] = await Promise.all([
        getAllAllocations(),
        getAllApplications(),
        getAllProperties(),
      ]);
      setAllocations(allocs);
      setApplications(apps);
      setProperties(props);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!applicationId) return;
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;
    setForm((p) => ({
      ...p,
      applicationId,
      propertyId: app.propertyId || p.propertyId,
      roomId: app.roomId || "",
      bedId: "",
      startDate: app.desiredMoveIn || p.startDate,
    }));
    setModalOpen(true);
  }, [applicationId, applications]);

  useEffect(() => {
    if (!form.propertyId) {
      setInventory(null);
      return;
    }
    getPropertyInventory(form.propertyId)
      .then(setInventory)
      .catch((err) => setError(err.message));
  }, [form.propertyId]);

  const approvedApps = useMemo(
    () =>
      applications.filter((a) =>
        ["approved", "accepted"].includes(a.status) && !a.allocationId
      ),
    [applications]
  );

  const availableBeds = useMemo(() => {
    if (!inventory?.rooms) return [];
    const rooms = form.roomId
      ? inventory.rooms.filter((r) => r.id === form.roomId)
      : inventory.rooms;
    return rooms.flatMap((r) =>
      (r.beds || [])
        .filter((b) => b.status === "available" && !b.currentAllocationId)
        .map((b) => ({ ...b, roomLabel: r.label }))
    );
  }, [inventory, form.roomId]);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "—";
  const appName = (id) => {
    const a = applications.find((x) => x.id === id);
    return a?.applicantName || a?.applicantEmail || id?.slice(0, 8) || "—";
  };

  const onPickBed = async (bedId) => {
    setForm((p) => ({ ...p, bedId }));
    try {
      const offers = await getOffersForBed(bedId);
      const offer = offers[0];
      if (offer) {
        setForm((p) => ({
          ...p,
          bedId,
          agreedMonthlyRent: String(offer.monthlyRent ?? ""),
          agreedDeposit: String(offer.depositAmount ?? ""),
          currency: offer.currency || "EUR",
        }));
      }
    } catch {
      /* optional pricing */
    }
  };

  const openAllocate = () => {
    setForm({
      applicationId: "",
      propertyId: "",
      roomId: "",
      bedId: "",
      startDate: "",
      plannedEndDate: "",
      agreedMonthlyRent: "",
      agreedDeposit: "",
      currency: "EUR",
    });
    setSearchParams({});
    setModalOpen(true);
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const id = await allocateBedAtomically(
        {
          applicationId: form.applicationId,
          bedId: form.bedId,
          startDate: form.startDate,
          plannedEndDate: form.plannedEndDate || null,
          agreedMonthlyRent: form.agreedMonthlyRent,
          agreedDeposit: form.agreedDeposit,
          currency: form.currency,
        },
        user.uid
      );
      setModalOpen(false);
      setSearchParams({});
      setMessage(`Allocation created (${id.slice(0, 8)}…). Bed is reserved — cannot be double-booked.`);
      await load();
    } catch (err) {
      setError(err.message || "Allocation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (allocationId) => {
    if (!confirm("Cancel this allocation and free the bed?")) return;
    try {
      await cancelAllocation(allocationId, user.uid);
      setMessage("Allocation cancelled; bed is available again.");
      await load();
    } catch (err) {
      setError(err.message || "Cancel failed");
    }
  };

  const handleInviteTenant = async (allocation) => {
    const app = applications.find((row) => row.id === allocation.applicationId);
    const email = app?.applicantEmail || "";
    if (!email) {
      setError("This allocation has no applicant email — add one on the application first.");
      return;
    }
    setInvitingId(allocation.id);
    setError("");
    setMessage("");
    try {
      const result = await provisionRenterAccountWithCredentials(user.uid, {
        email,
        displayName: allocation.applicantName || app?.applicantName || "",
        applicationId: allocation.applicationId || null,
        allocationId: allocation.id,
        propertyId: allocation.propertyId || null,
        phone: app?.applicantPhone || "",
      });
      setCredsResult(result);
      const sent = result.deliveryLogId && result.emailMode === "live";
      const failed = result.emailStatus === "failed";
      setMessage(
        failed
          ? `Login ready for ${email}, but live email failed — copy credentials below and send manually.`
          : sent
            ? `Login created for ${email}. Credentials email sent via Gmail.`
            : result.createdAuth
              ? `Login created for ${email}. Email is sandbox — copy credentials below (or set Settings → Email mode → Live after deploying Functions).`
              : `Existing account linked for ${email}. A password-reset email was requested.`
      );
      await load();
    } catch (err) {
      setError(err.message || "Could not create login");
    } finally {
      setInvitingId("");
    }
  };

  const visibleAllocations = allocations.filter((a) =>
    matchesQuery(
      search,
      a.applicantName,
      appName(a.applicationId),
      propertyName(a.propertyId),
      a.status,
      a.bedId,
      a.startDate,
      a.agreedMonthlyRent
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
        title="Room allocation"
        subtitle="Assign an approved applicant to a bed, then create their login — they get email credentials and must change the password on first sign-in"
        actions={
          <Button className="gap-2" onClick={openAllocate} disabled={!approvedApps.length}>
            <FiKey /> Allocate bed
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !modalOpen && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search tenant, property, or bed" />

      {!approvedApps.length && (
        <Alert variant="info">
          No approved applications waiting for a bed.{" "}
          <Link to="/manager/applicants" className="underline">
            Review applicants
          </Link>{" "}
          and set status to Approved first.
        </Alert>
      )}

      {allocations.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiKey}
            title="No allocations yet"
            description="Approve an applicant, then allocate an available bed."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleAllocations.length === 0 ? (
            <p className="text-sm text-gray-500">No allocations match that search.</p>
          ) : visibleAllocations.map((a) => (
            <Card
              key={a.id}
              className={`!p-3 sm:!p-4 ${highlight === a.id ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {a.applicantName || appName(a.applicationId)}
                    </h3>
                    <Badge
                      variant={
                        a.status === "reserved"
                          ? "warning"
                          : a.status === "active"
                            ? "success"
                            : "default"
                      }
                    >
                      {allocLabel(a.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {propertyName(a.propertyId)} · bed {a.bedId?.slice(0, 8)}…
                    {a.startDate ? ` · from ${a.startDate}` : ""}
                    {a.agreedMonthlyRent != null
                      ? ` · €${Number(a.agreedMonthlyRent).toLocaleString()}/mo`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={invitingId === a.id}
                    onClick={() => handleInviteTenant(a)}
                  >
                    {a.tenantUserId ? "Resend login email" : "Create login & email"}
                  </Button>
                  {(a.status === "reserved" || a.status === "pending") && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(a.id)}>
                      Cancel & free bed
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSearchParams({});
        }}
        title="Allocate bed"
        size="lg"
      >
        <form onSubmit={handleAllocate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Alert variant="info">
            Allocation runs in a Firestore transaction on the bed document. If two people try
            the same bed at once, only one succeeds.
          </Alert>
          <Select
            label="Approved application"
            required
            value={form.applicationId}
            onChange={(e) => {
              const id = e.target.value;
              const app = approvedApps.find((a) => a.id === id);
              setForm((p) => ({
                ...p,
                applicationId: id,
                propertyId: app?.propertyId || p.propertyId,
                roomId: app?.roomId || "",
                bedId: "",
                startDate: app?.desiredMoveIn || p.startDate,
              }));
            }}
            options={approvedApps.map((a) => ({
              value: a.id,
              label: `${a.applicantName || a.applicantEmail} — ${propertyName(a.propertyId)}`,
            }))}
            placeholder="Select applicant"
          />
          <Select
            label="Property"
            required
            value={form.propertyId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                propertyId: e.target.value,
                roomId: "",
                bedId: "",
              }))
            }
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select property"
          />
          <Select
            label="Room (optional filter)"
            value={form.roomId}
            onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value, bedId: "" }))}
            options={(inventory?.rooms || []).map((r) => ({
              value: r.id,
              label: r.label,
            }))}
            placeholder="All rooms"
          />
          <Select
            label="Available bed"
            required
            value={form.bedId}
            onChange={(e) => onPickBed(e.target.value)}
            options={availableBeds.map((b) => ({
              value: b.id,
              label: `${b.roomLabel} · ${b.label}`,
            }))}
            placeholder={
              availableBeds.length ? "Select bed" : "No available beds on this property"
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="Planned end (optional)"
              type="date"
              value={form.plannedEndDate}
              onChange={(e) => setForm((p) => ({ ...p, plannedEndDate: e.target.value }))}
            />
            <Input
              label="Agreed rent (€/mo)"
              type="number"
              min={0}
              required
              value={form.agreedMonthlyRent}
              onChange={(e) => setForm((p) => ({ ...p, agreedMonthlyRent: e.target.value }))}
            />
            <Input
              label="Agreed deposit (€)"
              type="number"
              min={0}
              value={form.agreedDeposit}
              onChange={(e) => setForm((p) => ({ ...p, agreedDeposit: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                setSearchParams({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!form.bedId}>
              Confirm allocation
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!credsResult}
        onClose={() => setCredsResult(null)}
        title="Tenant login credentials"
      >
        {credsResult && (
          <div className="space-y-4 text-sm">
            <Alert
              variant={
                credsResult.emailStatus === "sent"
                  ? "success"
                  : credsResult.emailStatus === "failed"
                    ? "error"
                    : "info"
              }
            >
              {credsResult.emailStatus === "sent"
                ? "Live Gmail SMTP sent the credentials to the tenant’s inbox."
                : credsResult.emailStatus === "failed"
                  ? `Live send failed: ${credsResult.emailError || "unknown error"}. Copy and send manually.`
                  : "Email is in sandbox mode — nothing went to the real inbox. Copy below, or set Superadmin → Settings → Email mode → Live after deploying Cloud Functions."}
            </Alert>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-800">
              <p>
                <span className="text-gray-500">Email:</span> {credsResult.email}
              </p>
              {credsResult.temporaryPassword ? (
                <p className="mt-2">
                  <span className="text-gray-500">Temporary password:</span>{" "}
                  {credsResult.temporaryPassword}
                </p>
              ) : (
                <p className="mt-2 text-gray-600">
                  Existing account — ask them to use the password-reset email / Forgot
                  password.
                </p>
              )}
              <p className="mt-2">
                <span className="text-gray-500">Login:</span> {credsResult.loginUrl}
              </p>
              <p className="mt-2 text-gray-600">
                On first login they must choose their own password.
              </p>
            </div>
            {credsResult.temporaryPassword && (
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const text = `HomeRental login\nEmail: ${credsResult.email}\nTemporary password: ${credsResult.temporaryPassword}\nSign in: ${credsResult.loginUrl}\n\nPlease change your password when you first sign in.`;
                  try {
                    await navigator.clipboard.writeText(text);
                    setMessage("Credentials copied to clipboard");
                  } catch {
                    setError("Could not copy — select the text manually");
                  }
                }}
              >
                Copy credentials message
              </Button>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setCredsResult(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
