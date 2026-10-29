import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllMoveEvents,
  createMoveEvent,
  updateMoveChecklistItem,
  completeMoveEvent,
  addMoveLegalFlag,
  getAllAllocations,
} from "../../lib/firestore";
import {
  MOVE_IN_CHECKLIST_ITEMS,
  MOVE_OUT_CHECKLIST_ITEMS,
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
  SearchBox,
  matchesQuery,
  Checkbox,
} from "../../components/ui";
import { FiCalendar, FiPlus } from "react-icons/fi";

export default function ManagerLifecycle() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [legalFlag, setLegalFlag] = useState("");
  const [form, setForm] = useState({
    type: "move_in",
    allocationId: "",
    plannedDate: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [rows, allocs] = await Promise.all([getAllMoveEvents(), getAllAllocations()]);
      setEvents(rows);
      setAllocations(allocs.filter((a) => !["cancelled"].includes(a.status)));
    } catch (err) {
      setError(err.message || "Failed to load lifecycle events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (!typeFilter || e.type === typeFilter) &&
          matchesQuery(search, e.applicantName, e.type, e.status, e.plannedDate, e.allocationId)
      ),
    [events, typeFilter, search]
  );

  const checklistDefs = (type) =>
    type === "move_out" ? MOVE_OUT_CHECKLIST_ITEMS : MOVE_IN_CHECKLIST_ITEMS;

  const progress = (event) => {
    const items = Object.values(event.checklist || {});
    if (!items.length) return "0/0";
    const done = items.filter((i) => i.done).length;
    return `${done}/${items.length}`;
  };

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createMoveEvent(
        {
          type: form.type,
          allocationId: form.allocationId,
          plannedDate: form.plannedDate || null,
          notes: form.notes,
        },
        user.uid
      );
      setModal(false);
      setMessage("Move event created — complete every checklist item before finishing.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (event, itemKey, done) => {
    try {
      await updateMoveChecklistItem(event.id, itemKey, { done }, user.uid);
      const refreshed = await getAllMoveEvents();
      setEvents(refreshed);
      const next = refreshed.find((r) => r.id === event.id);
      if (next) setDetail(next);
    } catch (err) {
      setError(err.message);
    }
  };

  const complete = async (eventId) => {
    setSaving(true);
    setError("");
    try {
      await completeMoveEvent(eventId, user.uid);
      setMessage("Move event completed. Legal/notice steps were staff-confirmed, not automated.");
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addFlag = async () => {
    if (!detail || !legalFlag.trim()) return;
    try {
      await addMoveLegalFlag(detail.id, legalFlag.trim(), user.uid);
      setLegalFlag("");
      setMessage("Legal/review flag recorded for staff follow-up");
      const refreshed = await getAllMoveEvents();
      setEvents(refreshed);
      setDetail(refreshed.find((r) => r.id === detail.id) || null);
    } catch (err) {
      setError(err.message);
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
        title="Move-in / Move-out"
        subtitle="Staff checklists — notice, deposit, and legal steps stay human-confirmed"
        actions={
          <Button className="gap-2" onClick={() => setModal(true)}>
            <FiPlus /> New event
          </Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && !modal && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search tenant, date, or type" />

      <Select
        className="w-full sm:max-w-xs"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        options={[
          { value: "move_in", label: "Move-in" },
          { value: "move_out", label: "Move-out" },
        ]}
        placeholder="All types"
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiCalendar}
            title={search ? "No matches" : "No move events"}
            description={search ? "Nothing in this list matches that search." : "Start a move-in or move-out checklist from an allocation."}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Card key={ev.id} className="!p-3 sm:!p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {ev.type === "move_out" ? "Move-out" : "Move-in"} ·{" "}
                      {ev.applicantName || "Tenant"}
                    </h3>
                    <Badge variant={ev.status === "completed" ? "success" : "default"}>
                      {ev.status}
                    </Badge>
                    <Badge>{progress(ev)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Planned {ev.plannedDate || "—"} · allocation {ev.allocationId?.slice(0, 8)}…
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setDetail(ev)}>
                  Checklist
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New move event" size="lg">
        <form onSubmit={create} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Select
            label="Type"
            required
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            options={[
              { value: "move_in", label: "Move-in" },
              { value: "move_out", label: "Move-out" },
            ]}
          />
          <Select
            label="Allocation"
            required
            value={form.allocationId}
            onChange={(e) => setForm((p) => ({ ...p, allocationId: e.target.value }))}
            options={allocations.map((a) => ({
              value: a.id,
              label: `${a.applicantName || a.id.slice(0, 6)} · ${a.status} · ${a.startDate || ""}`,
            }))}
          />
          <Input
            label="Planned date"
            type="date"
            value={form.plannedDate}
            onChange={(e) => setForm((p) => ({ ...p, plannedDate: e.target.value }))}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <Alert variant="info">
            Completing a move-out ends the allocation only after every checklist item — including
            staff approval of notice and availability reopen — is checked. Nothing is auto-judged
            as legally complete.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail
            ? `${detail.type === "move_out" ? "Move-out" : "Move-in"} checklist`
            : "Checklist"
        }
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-gray-600">
              {detail.applicantName || "Tenant"} · {detail.plannedDate || "no date"} ·{" "}
              <Badge>{detail.status}</Badge>
            </p>
            <ul className="space-y-3">
              {checklistDefs(detail.type).map((item) => {
                const state = detail.checklist?.[item.key] || { done: false };
                return (
                  <li key={item.key} className="rounded-lg border border-gray-100 p-3">
                    <Checkbox
                      label={item.label}
                      checked={Boolean(state.done)}
                      disabled={detail.status === "completed"}
                      onChange={(e) => toggleItem(detail, item.key, e.target.checked)}
                    />
                    {state.at && (
                      <p className="mt-1 text-xs text-gray-400">
                        {state.done ? "Done" : "Cleared"} {String(state.at).slice(0, 16)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="text-sm font-medium text-gray-800">Legal / review flags</p>
              <p className="text-xs text-gray-500">
                Record notice or deposit questions for humans — the system never concludes legal
                status.
              </p>
              {(detail.legalFlags || []).map((f, i) => (
                <p key={i} className="text-xs text-gray-600">
                  · {f.flag} ({String(f.at).slice(0, 16)})
                </p>
              ))}
              {detail.status !== "completed" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={legalFlag}
                    onChange={(e) => setLegalFlag(e.target.value)}
                    placeholder="e.g. deposit review needed"
                  />
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addFlag}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            {detail.status !== "completed" && (
              <Button className="w-full" loading={saving} onClick={() => complete(detail.id)}>
                Complete event
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
