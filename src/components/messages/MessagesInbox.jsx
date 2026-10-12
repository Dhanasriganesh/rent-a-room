import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getConversationsForUser,
  getMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  getOrCreateConversation,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  PageHeader,
  Card,
  EmptyState,
  Button,
  Input,
  Spinner,
  Avatar,
} from "../ui";
import { FiMessageSquare, FiSearch, FiSend } from "react-icons/fi";
import { formatRelativeDate } from "../../lib/constants";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function MessagesInbox({ role = "renter" }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(searchParams.get("c") || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);
  const endRef = useRef(null);

  const listingIdParam = searchParams.get("listing");

  const loadConversations = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getConversationsForUser(user.uid);
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user?.uid]);

  // Start conversation from listing deep-link (?listing=)
  useEffect(() => {
    async function bootstrapFromListing() {
      if (!user?.uid || !listingIdParam || bootstrapping) return;
      setBootstrapping(true);
      try {
        const listing = await getDocument(COLLECTIONS.LISTINGS, listingIdParam);
        if (!listing) return;
        const conversationId = await getOrCreateConversation({
          participantIds: [listing.ownerId, user.uid],
          contextType: "listing",
          contextId: listingIdParam,
          listingId: listingIdParam,
          listingTitle: listing.title,
        });
        setSelectedId(conversationId);
        setSearchParams({ c: conversationId });
        await loadConversations();
      } catch (err) {
        console.error(err);
      } finally {
        setBootstrapping(false);
      }
    }
    bootstrapFromListing();
  }, [listingIdParam, user?.uid]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return undefined;
    }

    markConversationRead(selectedId, user.uid).catch(() => {});

    let unsubscribe = () => {};
    unsubscribe = subscribeToMessages(
      selectedId,
      (msgs) => setMessages(msgs),
      () => {
        getMessages(selectedId).then(setMessages).catch(console.error);
      }
    );

    return () => unsubscribe();
  }, [selectedId, user?.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selected = conversations.find((c) => c.id === selectedId);

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.otherUser?.displayName?.toLowerCase().includes(q) ||
      c.listingTitle?.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    setSending(true);
    try {
      await sendMessage(selectedId, user.uid, newMessage);
      setNewMessage("");
      await loadConversations();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        subtitle={
          role === "owner"
            ? "Conversations with applicants and tenants"
            : "Conversations with property owners"
        }
      />

      {conversations.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiMessageSquare}
            title="No messages yet"
            description={
              role === "owner"
                ? "When renters apply or contact you, threads appear here."
                : "Apply to a listing or use Contact on a listing to start a chat."
            }
          />
        </Card>
      ) : (
        <div className="grid min-h-[60vh] overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-[320px_1fr]">
          <div className="border-b border-gray-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-gray-200 p-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto lg:max-h-[calc(60vh-60px)]">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(conv.id);
                    setSearchParams({ c: conv.id });
                  }}
                  className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${
                    selectedId === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <Avatar name={conv.otherUser?.displayName || "User"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-gray-900">
                        {conv.otherUser?.displayName || "User"}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatRelativeDate(toDate(conv.lastMessageAt))}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500">{conv.listingTitle}</p>
                    <p className="mt-0.5 truncate text-sm text-gray-600">{conv.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-[50vh] flex-col">
            {selected ? (
              <>
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                  <Avatar name={selected.otherUser?.displayName || "User"} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {selected.otherUser?.displayName || "User"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selected.listingTitle || selected.contextType}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
                  {messages.map((msg) => {
                    const mine = msg.senderId === user.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            mine
                              ? "bg-primary text-white"
                              : "bg-white text-gray-800 shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              mine ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {formatRelativeDate(toDate(msg.createdAt))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-200 p-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" loading={sending} className="gap-2">
                    <FiSend className="h-4 w-4" />
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-gray-400">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
