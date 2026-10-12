import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Button,
  Input,
  Spinner,
  Avatar,
  Badge,
} from "../../components/ui";
import {
  FiMessageSquare,
  FiSearch,
  FiSend,
  FiPaperclip,
  FiMoreVertical,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiHome,
} from "react-icons/fi";
import { formatRelativeDate } from "../../lib/constants";

export default function OwnerMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Simulate loading conversations
    setLoading(true);
    setTimeout(() => {
      // Mock data for demonstration
      setConversations([
        {
          id: "1",
          participant: {
            name: "John Smith",
            avatar: null,
          },
          lastMessage: "Thank you for accepting my application!",
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
          unreadCount: 2,
          type: "application",
          listingTitle: "Modern 2BR Apartment in Mitte",
        },
        {
          id: "2",
          participant: {
            name: "Sarah Wilson",
            avatar: null,
          },
          lastMessage: "The heating issue has been fixed. Thanks!",
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
          unreadCount: 0,
          type: "maintenance",
          unitName: "Apt 2B",
        },
        {
          id: "3",
          participant: {
            name: "Michael Brown",
            avatar: null,
          },
          lastMessage: "Is the apartment still available?",
          lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          unreadCount: 1,
          type: "inquiry",
          listingTitle: "Studio in Kreuzberg",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, [user?.uid]);

  useEffect(() => {
    if (selectedConversation) {
      // Mock messages for selected conversation
      setMessages([
        {
          id: "1",
          senderId: "other",
          text: "Hi, I'm interested in the apartment. Is it still available?",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          status: "read",
        },
        {
          id: "2",
          senderId: user?.uid,
          text: "Yes, it's still available! Would you like to schedule a viewing?",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          status: "read",
        },
        {
          id: "3",
          senderId: "other",
          text: "That would be great! I'm available this weekend.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
          status: "read",
        },
        {
          id: "4",
          senderId: user?.uid,
          text: "Perfect! How about Saturday at 2pm?",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
          status: "delivered",
        },
        {
          id: "5",
          senderId: "other",
          text: selectedConversation.lastMessage,
          timestamp: selectedConversation.lastMessageAt,
          status: "unread",
        },
      ]);
    }
  }, [selectedConversation, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: String(Date.now()),
      senderId: user?.uid,
      text: newMessage,
      timestamp: new Date(),
      status: "sending",
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Simulate sending
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: "delivered" } : m))
      );
    }, 500);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participant.name.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query) ||
      conv.listingTitle?.toLowerCase().includes(query) ||
      conv.unitName?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Communicate with applicants and tenants"
      />

      {conversations.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiMessageSquare}
            title="No messages yet"
            description="Your conversations with applicants and tenants will appear here."
          />
        </Card>
      ) : (
        <div className="grid h-[calc(100vh-16rem)] gap-4 lg:grid-cols-3">
          {/* Conversations List */}
          <Card className="flex flex-col overflow-hidden p-0 lg:col-span-1">
            {/* Search */}
            <div className="border-b border-gray-200 p-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedConversation?.id === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar name={conv.participant.name} />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                          {conv.participant.name}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatRelativeDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {conv.type === "application" && (
                          <span className="flex items-center gap-1">
                            <FiUser className="h-3 w-3" />
                            {conv.listingTitle}
                          </span>
                        )}
                        {conv.type === "maintenance" && (
                          <span className="flex items-center gap-1">
                            <FiHome className="h-3 w-3" />
                            {conv.unitName}
                          </span>
                        )}
                        {conv.type === "inquiry" && (
                          <span className="flex items-center gap-1">
                            <FiMessageSquare className="h-3 w-3" />
                            {conv.listingTitle}
                          </span>
                        )}
                      </p>
                      <p className={`mt-1 truncate text-sm ${conv.unreadCount > 0 ? "font-medium text-gray-900" : "text-gray-500"}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="flex flex-col overflow-hidden p-0 lg:col-span-2">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedConversation.participant.name} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedConversation.participant.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.type === "application" && `Re: ${selectedConversation.listingTitle}`}
                        {selectedConversation.type === "maintenance" && `${selectedConversation.unitName} - Maintenance`}
                        {selectedConversation.type === "inquiry" && `Inquiry: ${selectedConversation.listingTitle}`}
                      </p>
                    </div>
                  </div>
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                    <FiMoreVertical className="h-5 w-5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-primary text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p>{message.text}</p>
                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                                isOwn ? "text-white/70" : "text-gray-400"
                              }`}
                            >
                              <span>
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isOwn && (
                                <>
                                  {message.status === "sending" && (
                                    <FiClock className="h-3 w-3" />
                                  )}
                                  {message.status === "delivered" && (
                                    <FiCheck className="h-3 w-3" />
                                  )}
                                  {message.status === "read" && (
                                    <FiCheckCircle className="h-3 w-3" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <FiPaperclip className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button type="submit" disabled={!newMessage.trim()} className="gap-2">
                      <FiSend className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <FiMessageSquare className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
