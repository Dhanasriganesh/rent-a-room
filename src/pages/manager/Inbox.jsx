import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getStaffInboxConversations,
  getMessages,
  sendStaffInboxReply,
  updateInboxConversation,
  getDeliveryLogs,
  retryDeliveryLog,
  getAllProperties,
  subscribeToMessages,
} from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  Spinner,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Tabs,
} from "../../components/ui";
import { FiInbox, FiSend } from "react-icons/fi";

const STATUS_OPTS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

const CHANNEL_OPTS = [
  { value: "website", label: "Website" },
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

function channelOf(c) {
  return c.channel || "in_app";
}

function titleOf(c) {
  return c.guestName || c.listingTitle || c.guestEmail || c.id.slice(0, 8);
}

export default function ManagerInbox() {
  const { user } = useAuth();
  const [tab, setTab] = useState("inbox");
  const [threads, setThreads] = useState([]);
  const [properties, setProperties] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [rows, props, delivery] = await Promise.all([
        getStaffInboxConversations(),
        getAllProperties(),
        getDeliveryLogs(40),
      ]);
      setThreads(rows);
      setProperties(props);
      setLogs(delivery);
    } catch (err) {
      setError(err.message || "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = threads.find((t) => t.id === selectedId);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return undefined;
    }
    setNotes(selected?.internalNotes || "");
    let unsub = () => {};
    try {
      unsub = subscribeToMessages(selectedId, setMessages, () => {});
    } catch {
      getMessages(selectedId).then(setMessages).catch(() => {});
    }
    updateInboxConversation(selectedId, { unreadForStaff: false }, user.uid).catch(() => {});
    return () => unsub();
  }, [selectedId]);

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      if (channelFilter && channelOf(t) !== channelFilter) return false;
      if (statusFilter && (t.status || "open") !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${titleOf(t)} ${t.guestEmail || ""} ${t.lastMessage || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [threads, channelFilter, statusFilter, search]);

  const propertyName = (id) => properties.find((p) => p.id === id)?.name || "";

  const sendReply = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await sendStaffInboxReply(selectedId, user.uid, reply);
      setReply("");
      setMessage("Reply sent (guest email sandboxed — see Delivery logs)");
      await load();
    } catch (err) {
      setError(err.message || "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const patchMeta = async (patch) => {
    if (!selectedId) return;
    try {
      await updateInboxConversation(selectedId, patch, user.uid);
      setMessage("Conversation updated");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveNotes = async () => {
    await patchMeta({ internalNotes: notes });
  };

  const retryLog = async (id) => {
    try {
      await retryDeliveryLog(id, user.uid);
      setMessage("Retry recorded (sandbox — no external send)");
      setLogs(await getDeliveryLogs(40));
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
        title="Messages / Inbox"
        subtitle="Website, in-app, and sandboxed email — human handover"
      />

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <Alert variant="info">
        Email mode is <strong>sandbox</strong>: delivery logs are written, but no real external
        messages are sent until a provider is configured in a later release.
      </Alert>

      <Tabs
        tabs={[
          { id: "inbox", label: `Inbox (${threads.length})` },
          { id: "delivery", label: `Delivery logs (${logs.length})` },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "delivery" && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <Card>
              <EmptyState icon={FiInbox} title="No delivery logs" description="Outbound email attempts appear here." />
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="!p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{log.channel}</Badge>
                      <Badge variant="warning">{log.mode}</Badge>
                      <Badge variant="info">{log.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-800">
                      To {log.to} · {log.subject}
                    </p>
                    <p className="text-xs text-gray-500">
                      Attempts {log.attempts}/{log.maxAttempts || 5}
                      {log.lastError ? ` · ${log.lastError}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => retryLog(log.id)}>
                    Retry
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "inbox" && (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <Card className="!p-3 space-y-3">
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              options={CHANNEL_OPTS}
              placeholder="All channels"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTS}
              placeholder="All statuses"
            />
            <div className="max-h-[28rem] space-y-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No conversations</p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedId === t.id ? "bg-primary/10 text-primary" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{titleOf(t)}</span>
                      <Badge variant="default">{channelOf(t)}</Badge>
                    </div>
                    <p className="truncate text-xs text-gray-500">{t.lastMessage || "—"}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="!p-0 flex min-h-[28rem] flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  icon={FiInbox}
                  title="Select a conversation"
                  description="Website enquiries and in-app threads appear on the left."
                />
              </div>
            ) : (
              <>
                <div className="space-y-2 border-b border-gray-100 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{titleOf(selected)}</h2>
                    <Badge>{channelOf(selected)}</Badge>
                    <Badge variant="info">{selected.status || "open"}</Badge>
                    <Badge variant="warning">{selected.handoverState || "human"}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selected.guestEmail || "In-app participants"}
                    {selected.propertyId ? ` · ${propertyName(selected.propertyId)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={selected.status || "open"}
                      onChange={(e) => patchMeta({ status: e.target.value })}
                      options={STATUS_OPTS}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patchMeta({
                          assignedManagerId: user.uid,
                          handoverState: "human",
                        })
                      }
                    >
                      Assign to me
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patchMeta({ status: "escalated", handoverState: "human" })}
                    >
                      Escalate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchMeta({ status: "resolved" })}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        m.senderType === "staff" || m.senderId === user.uid
                          ? "ml-auto bg-primary text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p>{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {m.senderType || "user"}
                        {m.deliveryStatus ? ` · ${m.deliveryStatus}` : ""}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-gray-100 p-4">
                  <Textarea
                    label="Internal notes (staff only)"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button size="sm" variant="outline" onClick={saveNotes}>
                    Save notes
                  </Button>
                  <form onSubmit={sendReply} className="flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Reply to contact…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      required
                    />
                    <Button type="submit" loading={busy} className="gap-1">
                      <FiSend /> Send
                    </Button>
                  </form>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
