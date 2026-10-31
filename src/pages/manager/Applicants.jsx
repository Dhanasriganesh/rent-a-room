import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllApplications,
  getAllProperties,
  createStaffApplication,
  updateApplicationStatus,
  updateApplicationNotes,
  getRoomsByProperty,
  getApplicantDossier,
} from "../../lib/firestore";
import {
  APPLICATION_STATUSES,
  CONTRACT_STATUSES,
  DOCUMENT_CATEGORIES,
  formatDate,
  formatRelativeDate,
} from "../../lib/constants";
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
  OpenInWhatsApp,
} from "../../components/ui";
import { FiPlus, FiInbox, FiKey, FiArrowLeft, FiFileText, FiHome } from "react-icons/fi";

const PIPELINE = [
  "new",
  "under_review",
  "more_information_requested",
  "viewing_scheduled",
  "approved",
  "allocated",
  "rejected",
  "withdrawn",
  "closed",
];

const QUEUES = [
  {
    id: "review",
    label: "To review",
    hint: "New and in progress",
    statuses: [
      "new",
      "under_review",
      "in_review",
      "more_information_requested",
      "more_info_needed",
      "viewing_scheduled",
      "viewing_requested",
    ],
  },
  {
    id: "place",
    label: "Ready",
    hint: "Approved, not placed",
    statuses: ["approved", "accepted"],
  },
  {
    id: "placed",
    label: "Placed",
    hint: "Already on a bed",
    statuses: ["allocated"],
  },
  {
    id: "closed",
    label: "Closed",
    hint: "Rejected or withdrawn",
    statuses: ["rejected", "withdrawn", "closed"],
  },
];

const TONE = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-800",
  success: "bg-emerald-50 text-emerald-800",
  primary: "bg-[#2C1810]/10 text-[#2C1810]",
  danger: "bg-red-50 text-red-700",
  default: "bg-gray-100 text-gray-600",
};

const NEXT_STEPS = {
  new: [
    { value: "under_review", label: "Start review" },
    { value: "more_information_requested", label: "Ask for info" },
    { value: "rejected", label: "Reject" },
  ],
  under_review: [
    { value: "viewing_scheduled", label: "Schedule viewing" },
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
  ],
  in_review: [
    { value: "viewing_scheduled", label: "Schedule viewing" },
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
  ],
  more_information_requested: [
    { value: "under_review", label: "Back to review" },
    { value: "rejected", label: "Reject" },
  ],
  more_info_needed: [
    { value: "under_review", label: "Back to review" },
    { value: "rejected", label: "Reject" },
  ],
  viewing_scheduled: [
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
  ],
  viewing_requested: [
    { value: "viewing_scheduled", label: "Mark viewing set" },
    { value: "rejected", label: "Reject" },
  ],
  approved: [{ value: "rejected", label: "Reject" }],
  accepted: [{ value: "rejected", label: "Reject" }],
  rejected: [{ value: "under_review", label: "Reopen" }],
  withdrawn: [{ value: "under_review", label: "Reopen" }],
  closed: [{ value: "under_review", label: "Reopen" }],
};

const statusMeta = (value) => APPLICATION_STATUSES.find((s) => s.value === value);

const statusLabel = (value) => statusMeta(value)?.label || String(value || "").replace(/_/g, " ");

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0][0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function sourceLabel(source) {
  if (source === "public") return "Website";
  if (source === "browse_link") return "Share link";
  if (source === "staff") return "Desk";
  return "";
}

function queueForStatus(status) {
  return QUEUES.find((queue) => queue.statuses.includes(status))?.id || "review";
}

function placementLine(app) {
  const room = app.roomLabel || "";
  const bed = app.bedLabel || "";
  if (room && bed) return `${room} · ${bed}`;
  if (bed) return bed;
  if (room) return room;
  return "";
}

function contractStatusLabel(value) {
  return CONTRACT_STATUSES.find((s) => s.value === value)?.label || String(value || "").replace(/_/g, " ");
}

function documentCategoryLabel(value) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label || String(value || "").replace(/_/g, " ");
}

function money(amount, currency = "EUR") {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `€${n.toLocaleString()}`;
  }
}

export default function ManagerApplicants() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const openId = searchParams.get("open") || "";

  const [apps, setApps] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState(initialStatus ? queueForStatus(initialStatus) : "review");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    propertyId: "",
    roomId: "",
    requestedRoomType: "",
    desiredMoveIn: "",
    intendedDuration: "",
    numberOfOccupants: "1",
    message: "",
    internalNotes: "",
  });
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [decisionNote, setDecisionNote] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, props] = await Promise.all([getAllApplications(), getAllProperties()]);
      setApps(rows);
      setProperties(props);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.propertyId) {
      setRooms([]);
      return;
    }
    getRoomsByProperty(form.propertyId)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [form.propertyId]);

  useEffect(() => {
    if (!openId || !apps.length) return;
    if (detail?.id === openId) return;
    const app = apps.find((row) => row.id === openId);
    if (app) {
      openDetail(app);
      setQueue(queueForStatus(app.status));
    }
    // Intentionally only when openId or apps identity changes enough to find the row
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, apps]);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "";

  const scoped = useMemo(() => {
    return apps.filter((app) => {
      if (propertyFilter && app.propertyId !== propertyFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${app.applicantName || ""} ${app.applicantEmail || ""} ${app.applicantPhone || ""} ${app.listingTitle || ""} ${app.propertyName || ""} ${app.roomLabel || ""} ${app.bedLabel || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, propertyFilter, search]);

  const queueCounts = useMemo(() => {
    const map = {};
    for (const item of QUEUES) {
      map[item.id] = scoped.filter((app) => item.statuses.includes(app.status)).length;
    }
    return map;
  }, [scoped]);

  const activeQueue = QUEUES.find((item) => item.id === queue) || QUEUES[0];

  const filtered = useMemo(
    () => scoped.filter((app) => activeQueue.statuses.includes(app.status)),
    [scoped, activeQueue]
  );

  const openCreate = () => {
    setForm({
      applicantName: "",
      applicantEmail: "",
      applicantPhone: "",
      propertyId: propertyFilter || "",
      roomId: "",
      requestedRoomType: "",
      desiredMoveIn: "",
      intendedDuration: "",
      numberOfOccupants: "1",
      message: "",
      internalNotes: "",
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createStaffApplication(
        {
          ...form,
          numberOfOccupants: Number(form.numberOfOccupants) || 1,
        },
        user.uid
      );
      setCreateOpen(false);
      setMessage("Application recorded");
      setQueue("review");
      await load();
    } catch (err) {
      setError(err.message || "Could not create application");
    } finally {
      setSaving(false);
    }
  };

  const loadDossier = async (applicationId) => {
    setDossierLoading(true);
    try {
      const data = await getApplicantDossier(applicationId);
      setDossier(data);
      if (data?.application) {
        setDetail((current) =>
          current?.id === applicationId ? { ...current, ...data.application } : current
        );
      }
    } catch (err) {
      console.error(err);
      setDossier(null);
      setError(err.message || "Could not load full person record");
    } finally {
      setDossierLoading(false);
    }
  };

  const openDetail = (app) => {
    setDetail(app);
    setDossier(null);
    setNotesDraft(app.internalNotes || "");
    setStatusDraft(app.status);
    setDecisionNote(app.decisionNote || "");
    setError("");
    if (searchParams.get("open") !== app.id) {
      const next = new URLSearchParams(searchParams);
      next.set("open", app.id);
      setSearchParams(next, { replace: true });
    }
    loadDossier(app.id);
  };

  const saveNotes = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updateApplicationNotes(detail.id, notesDraft, user.uid);
      setMessage("Notes saved");
      setDetail((current) => (current ? { ...current, internalNotes: notesDraft } : current));
      await load();
      await loadDossier(detail.id);
    } catch (err) {
      setError(err.message || "Could not save notes");
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async (nextStatus = statusDraft) => {
    if (!detail || !nextStatus) return;
    setSaving(true);
    setError("");
    try {
      await updateApplicationStatus(detail.id, nextStatus, decisionNote, user.uid);
      setStatusDraft(nextStatus);
      setDetail((current) =>
        current ? { ...current, status: nextStatus, decisionNote } : current
      );
      setMessage(`${detail.applicantName || "Applicant"} is now ${statusLabel(nextStatus).toLowerCase()}`);
      setQueue(queueForStatus(nextStatus));
      await load();
      await loadDossier(detail.id);
    } catch (err) {
      setError(err.message || "Could not update status");
    } finally {
      setSaving(false);
    }
  };

  if (loading && apps.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const steps = detail ? NEXT_STEPS[detail.status] || [] : [];
  const submitted = detail ? asDate(detail.submittedAt || detail.createdAt) : null;
  const housing = dossier?.housing;
  const placeName = detail
    ? housing?.propertyName ||
      detail.propertyName ||
      propertyName(detail.propertyId) ||
      detail.listingTitle ||
      "No property yet"
    : "";
  const assignedBed =
    housing?.bedLabel || detail?.bedLabel
      ? [housing?.roomLabel || detail?.roomLabel, housing?.bedLabel || detail?.bedLabel]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Applicants"
        subtitle="Work the queue. Open a person, decide, then place them on a bed."
        actions={
          <Button className="gap-2" onClick={openCreate}>
            <FiPlus /> Record
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !createOpen && !detail && <Alert variant="error">{error}</Alert>}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card padding={false} className={detail ? "hidden lg:block" : ""}>
          <div className="space-y-2 border-b border-gray-100 p-3">
            <div className="grid grid-cols-4 gap-1">
              {QUEUES.map((item) => {
                const active = queue === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQueue(item.id)}
                    className={`rounded-lg px-1.5 py-2 text-center ${
                      active ? "bg-[#2C1810] text-white" : "bg-[#f6f3ef] text-[#2C1810]"
                    }`}
                  >
                    <span className="block text-base font-semibold leading-none">{queueCounts[item.id] || 0}</span>
                    <span className={`mt-1 block text-[10px] leading-tight ${active ? "text-white/80" : "text-[#2C1810]/60"}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Search name, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="All properties"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-gray-800">No one in {activeQueue.label.toLowerCase()}</p>
              <p className="mt-1 text-xs text-gray-500">{activeQueue.hint}</p>
              {queue === "review" && (
                <Button size="sm" className="mt-3" onClick={openCreate}>
                  Record application
                </Button>
              )}
            </div>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-gray-100 overflow-y-auto">
              {filtered.map((app) => {
                const active = detail?.id === app.id;
                const when = asDate(app.submittedAt || app.createdAt);
                const meta = statusMeta(app.status);
                const place = placementLine(app);
                const prop =
                  app.propertyName || propertyName(app.propertyId) || app.listingTitle || "No property";
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => openDetail(app)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left ${
                        active ? "bg-[#fff4e8]" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C1810] text-[11px] font-semibold text-white">
                        {initials(app.applicantName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-gray-900">
                            {app.applicantName || "Unnamed"}
                          </span>
                          <span className="shrink-0 text-[11px] text-gray-400">
                            {when ? formatRelativeDate(when) : ""}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
                            {place ? `${prop} · ${place}` : prop}
                          </span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE[meta?.color] || TONE.default}`}>
                            {statusLabel(app.status)}
                          </span>
                        </span>
                        {place ? (
                          <span className="mt-0.5 block truncate text-[11px] font-medium text-[#2C1810]/70">
                            Bed: {place}
                          </span>
                        ) : null}
                        {app.applicantPhone ? (
                          <span className="mt-1 block" onClick={(e) => e.stopPropagation()}>
                            <OpenInWhatsApp phone={app.applicantPhone} size="xs" stopPropagation />
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className={`!p-0 ${detail ? "" : "hidden lg:block"}`}>
          {!detail ? (
            <div className="flex min-h-[24rem] items-center justify-center p-6">
              <EmptyState
                icon={FiInbox}
                title="Select an applicant"
                description="The list on the left is the queue. Open someone to read their note and move them on."
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="border-b border-gray-100 p-3 sm:p-4">
                <button
                  type="button"
                  className="mb-2 text-sm font-medium text-primary lg:hidden"
                  onClick={() => {
                    setDetail(null);
                    setDossier(null);
                    const next = new URLSearchParams(searchParams);
                    next.delete("open");
                    setSearchParams(next, { replace: true });
                  }}
                >
                  <FiArrowLeft className="mr-1 inline" /> Queue
                </button>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2C1810] text-sm font-semibold text-white">
                    {initials(detail.applicantName)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-900">
                      {detail.applicantName || "Unnamed applicant"}
                    </h2>
                    <p className="truncate text-sm text-gray-500">{detail.applicantEmail || "No email"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[statusMeta(detail.status)?.color] || TONE.default}`}>
                        {statusLabel(detail.status)}
                      </span>
                      {sourceLabel(detail.source) && <Badge>{sourceLabel(detail.source)}</Badge>}
                      <OpenInWhatsApp phone={detail.applicantPhone} always />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-3 sm:p-4">
                {error && <Alert variant="error">{error}</Alert>}

                {assignedBed ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-950">
                    <div className="flex items-start gap-2">
                      <FiHome className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Assigned bed</p>
                        <p>
                          {placeName}
                          {assignedBed ? ` · ${assignedBed}` : ""}
                        </p>
                        {(housing?.allocationStatus || housing?.startDate) && (
                          <p className="mt-0.5 text-xs text-emerald-800/80">
                            {[
                              housing?.allocationStatus
                                ? `Status: ${housing.allocationStatus}`
                                : null,
                              housing?.startDate
                                ? `From ${formatDate(housing.startDate)}`
                                : null,
                              housing?.plannedEndDate
                                ? `Until ${formatDate(housing.plannedEndDate)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {(housing?.monthlyRent != null || housing?.deposit != null) && (
                          <p className="mt-0.5 text-xs text-emerald-800/80">
                            Rent {money(housing.monthlyRent, dossier?.allocation?.currency)}
                            {housing.deposit != null
                              ? ` · Deposit ${money(housing.deposit, dossier?.allocation?.currency)}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">Property</dt>
                    <dd className="text-gray-800">{placeName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">Phone</dt>
                    <dd className="flex flex-wrap items-center gap-2 text-gray-800">
                      <span>{detail.applicantPhone || "—"}</span>
                      <OpenInWhatsApp phone={detail.applicantPhone} always size="xs" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">Move-in</dt>
                    <dd className="text-gray-800">
                      {detail.desiredMoveIn ? formatDate(detail.desiredMoveIn) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">Stay</dt>
                    <dd className="text-gray-800">
                      {detail.intendedDuration || "—"}
                      {detail.numberOfOccupants ? ` · ${detail.numberOfOccupants} people` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                      Requested room
                    </dt>
                    <dd className="text-gray-800">{detail.requestedRoomType || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                      Assigned bed
                    </dt>
                    <dd className="text-gray-800">{assignedBed || "Not placed yet"}</dd>
                  </div>
                  {housing?.propertyAddress ? (
                    <div className="col-span-2">
                      <dt className="text-[11px] uppercase tracking-wide text-gray-400">Address</dt>
                      <dd className="text-gray-800">{housing.propertyAddress}</dd>
                    </div>
                  ) : null}
                </dl>

                {detail.message && (
                  <blockquote className="rounded-lg bg-[#f6f3ef] px-3 py-2 text-sm text-gray-800">
                    {detail.message}
                  </blockquote>
                )}

                {submitted && (
                  <p className="text-xs text-gray-400">Received {formatDate(submitted)}</p>
                )}

                {detail.status !== "allocated" && steps.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {steps.map((step, index) => (
                      <Button
                        key={step.value}
                        size="sm"
                        variant={index === 0 && step.value !== "rejected" ? "primary" : "outline"}
                        loading={saving}
                        onClick={() => saveStatus(step.value)}
                      >
                        {step.label}
                      </Button>
                    ))}
                  </div>
                )}

                {["approved", "accepted"].includes(detail.status) && (
                  <Button
                    className="w-full gap-1 sm:w-auto"
                    onClick={() => navigate(`/manager/allocations?applicationId=${detail.id}`)}
                  >
                    <FiKey /> Allocate a bed
                  </Button>
                )}

                {(detail.allocationId || housing?.allocationId) && (
                  <Link
                    to={`/manager/allocations?highlight=${detail.allocationId || housing.allocationId}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <FiKey /> View allocation
                  </Link>
                )}

                {dossierLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                    <Spinner size="sm" /> Loading related records…
                  </div>
                ) : (
                  <>
                    <section className="space-y-2 border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900">Account</h3>
                      {dossier?.user ? (
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                              Login email
                            </dt>
                            <dd className="text-gray-800">{dossier.user.email || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                              Role / status
                            </dt>
                            <dd className="text-gray-800">
                              {dossier.user.role || "renter"}
                              {dossier.user.accountStatus
                                ? ` · ${dossier.user.accountStatus}`
                                : ""}
                            </dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-gray-400">
                              Stored housing on user
                            </dt>
                            <dd className="text-gray-800">
                              {dossier.user.currentHousing?.propertyName ||
                              dossier.user.currentHousing?.bedLabel
                                ? [
                                    dossier.user.currentHousing.propertyName,
                                    dossier.user.currentHousing.roomLabel,
                                    dossier.user.currentHousing.bedLabel,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "Not written on user yet"}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No login account linked yet. Provision from Allocations when ready.
                        </p>
                      )}
                    </section>

                    <section className="space-y-2 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Rental documents
                        </h3>
                        <Link
                          to={`/manager/contracts?applicationId=${detail.id}`}
                          className="text-xs font-medium text-primary"
                        >
                          Open documents
                        </Link>
                      </div>
                      {!dossier?.contracts?.length ? (
                        <p className="text-sm text-gray-500">No contracts or rental documents yet.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                          {dossier.contracts.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start justify-between gap-2 px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {c.title || c.category || "Document"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {documentCategoryLabel(c.category)} ·{" "}
                                  {contractStatusLabel(c.status)}
                                </p>
                              </div>
                              <Link
                                to={`/manager/contracts?highlight=${c.id}`}
                                className="shrink-0 text-xs font-medium text-primary"
                              >
                                Open
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="space-y-2 border-t border-gray-100 pt-4">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <FiFileText /> Uploaded files
                      </h3>
                      {!dossier?.documents?.length ? (
                        <p className="text-sm text-gray-500">No uploaded files on this person.</p>
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {dossier.documents.map((docRow) => (
                            <li key={docRow.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-gray-800">
                                {docRow.fileName || docRow.title || docRow.id}
                                {docRow.category ? (
                                  <span className="text-gray-400">
                                    {" "}
                                    · {documentCategoryLabel(docRow.category)}
                                  </span>
                                ) : null}
                              </span>
                              {docRow.fileUrl || docRow.downloadUrl || docRow.url ? (
                                <a
                                  href={docRow.fileUrl || docRow.downloadUrl || docRow.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shrink-0 text-xs font-medium text-primary"
                                >
                                  View
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section className="space-y-2 border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-900">Rent charges</h3>
                      {!dossier?.charges?.length ? (
                        <p className="text-sm text-gray-500">No rent charges yet.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
                          {dossier.charges.map((charge) => (
                            <li
                              key={charge.id}
                              className="flex items-center justify-between gap-2 px-3 py-2"
                            >
                              <span className="text-gray-800">
                                {charge.period || charge.label || "Charge"}
                              </span>
                              <span className="text-gray-600">
                                {money(charge.amount, charge.currency)} ·{" "}
                                {charge.status || "open"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {dossier?.moveEvents?.length > 0 && (
                      <section className="space-y-2 border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900">Move events</h3>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {dossier.moveEvents.map((ev) => (
                            <li key={ev.id}>
                              {ev.type || ev.eventType || "Event"}
                              {ev.date || ev.createdAt
                                ? ` · ${formatDate(ev.date || ev.createdAt)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </>
                )}

                <Textarea
                  label="Reply or decision note"
                  rows={2}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                />
                <Textarea
                  label="Internal notes"
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                />

                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium text-gray-700">Set a different status</summary>
                  <div className="mt-3 space-y-3">
                    <Select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      options={PIPELINE.map((s) => ({ value: s, label: statusLabel(s) }))}
                      disabled={detail.status === "allocated"}
                    />
                    {detail.status !== "allocated" && (
                      <Button type="button" size="sm" variant="outline" loading={saving} onClick={() => saveStatus()}>
                        Apply status
                      </Button>
                    )}
                  </div>
                </details>

                <div className="flex justify-end">
                  <Button type="button" variant="outline" loading={saving} onClick={saveNotes}>
                    Save notes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Record application"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Select
            label="Property"
            required
            value={form.propertyId}
            onChange={(e) =>
              setForm((p) => ({ ...p, propertyId: e.target.value, roomId: "" }))
            }
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select property"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Preferred room (optional)"
              value={form.roomId}
              onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
              options={rooms.map((r) => ({ value: r.id, label: r.label }))}
              placeholder="Any / not specified"
            />
            <Input
              label="Requested room type"
              value={form.requestedRoomType}
              onChange={(e) => setForm((p) => ({ ...p, requestedRoomType: e.target.value }))}
              placeholder="e.g. private, shared"
            />
            <Input
              label="Intended duration"
              value={form.intendedDuration}
              onChange={(e) => setForm((p) => ({ ...p, intendedDuration: e.target.value }))}
              placeholder="e.g. 6 months"
            />
            <Input
              label="Occupants"
              type="number"
              min={1}
              value={form.numberOfOccupants}
              onChange={(e) => setForm((p) => ({ ...p, numberOfOccupants: e.target.value }))}
            />
          </div>
          <Textarea
            label="Applicant message"
            rows={2}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          />
          <Textarea
            label="Internal notes (staff only)"
            rows={2}
            value={form.internalNotes}
            onChange={(e) => setForm((p) => ({ ...p, internalNotes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
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
