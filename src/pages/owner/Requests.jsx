import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner,
  StatsCard,
} from "../../components/ui";
import {
  FiTool,
  FiSearch,
  FiFilter,
  FiMessageSquare,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiHome,
  FiCalendar,
  FiUser,
  FiChevronRight,
  FiPaperclip,
} from "react-icons/fi";
import {
  getRequestsByOwner,
  updateRequestStatus,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  REQUEST_CATEGORIES,
  getStatusConfig,
  formatDate,
  formatRelativeDate,
} from "../../lib/constants";

export default function OwnerRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [user?.uid]);

  const fetchRequests = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getRequestsByOwner(user.uid);
      // Fetch unit and tenant details
      const requestsWithDetails = await Promise.all(
        data.map(async (request) => {
          const [unit, createdByUser] = await Promise.all([
            getDocument(COLLECTIONS.UNITS, request.unitId),
            getDocument(COLLECTIONS.USERS, request.createdBy),
          ]);
          return { ...request, unit, createdByUser };
        })
      );
      setRequests(requestsWithDetails);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) return;
    setProcessing(true);
    try {
      await updateRequestStatus(selectedRequest.id, newStatus, resolutionNote);
      await fetchRequests();
      setShowUpdateModal(false);
      setSelectedRequest(null);
      setNewStatus("");
      setResolutionNote("");
    } catch (error) {
      console.error("Error updating request:", error);
    } finally {
      setProcessing(false);
    }
  };

  const openUpdateModal = (request, status) => {
    setSelectedRequest(request);
    setNewStatus(status);
    setShowUpdateModal(true);
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      !searchQuery ||
      request.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.unit?.unitName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || request.status === statusFilter;
    const matchesPriority = !priorityFilter || request.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const openRequests = requests.filter((r) => !["resolved", "closed"].includes(r.status));
  const urgentRequests = openRequests.filter((r) => r.priority === "urgent" || r.priority === "high");
  const resolvedThisMonth = requests.filter((r) => {
    if (r.status !== "resolved" && r.status !== "closed") return false;
    const resolvedAt = r.resolvedAt?.toDate ? r.resolvedAt.toDate() : new Date(r.resolvedAt);
    const now = new Date();
    return resolvedAt.getMonth() === now.getMonth() && resolvedAt.getFullYear() === now.getFullYear();
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
        title="Maintenance Requests"
        subtitle="Track and resolve tenant maintenance requests"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatsCard
          label="Open Requests"
          value={openRequests.length}
          icon={FiTool}
          trend="neutral"
        />
        <StatsCard
          label="Urgent/High Priority"
          value={urgentRequests.length}
          icon={FiAlertCircle}
          trend={urgentRequests.length > 0 ? "down" : "neutral"}
        />
        <StatsCard
          label="In Progress"
          value={requests.filter((r) => r.status === "in_progress").length}
          icon={FiClock}
          trend="neutral"
        />
        <StatsCard
          label="Resolved This Month"
          value={resolvedThisMonth.length}
          icon={FiCheck}
          trend="up"
        />
      </div>

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiTool}
            title="No maintenance requests yet"
            description="When tenants submit maintenance requests, they'll appear here for you to track and resolve."
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: "", label: "All Statuses" },
                ...REQUEST_STATUSES,
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            />
            <Select
              options={[
                { value: "", label: "All Priorities" },
                ...REQUEST_PRIORITIES,
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiSearch}
                title="No requests found"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={() => {
                    setSelectedRequest(request);
                    setShowDetailModal(true);
                  }}
                  onUpdateStatus={openUpdateModal}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRequest(null);
        }}
        title="Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedRequest.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={getStatusConfig(REQUEST_STATUSES, selectedRequest.status).color}>
                    {getStatusConfig(REQUEST_STATUSES, selectedRequest.status).label}
                  </Badge>
                  <Badge variant={getStatusConfig(REQUEST_PRIORITIES, selectedRequest.priority).color}>
                    {getStatusConfig(REQUEST_PRIORITIES, selectedRequest.priority).label} Priority
                  </Badge>
                  <Badge variant="default">
                    {REQUEST_CATEGORIES.find((c) => c.value === selectedRequest.category)?.label || selectedRequest.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <FiHome className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Unit</p>
                  <p className="font-medium text-gray-900">
                    {selectedRequest.unit?.unitName || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <FiUser className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Reported by</p>
                  <p className="font-medium text-gray-900">
                    {selectedRequest.createdByUser?.displayName || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <FiCalendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.createdAt?.toDate?.() || selectedRequest.createdAt)}
                  </p>
                </div>
              </div>
              {selectedRequest.preferredTimes && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <FiClock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Preferred Times</p>
                    <p className="font-medium text-gray-900">{selectedRequest.preferredTimes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedRequest.description && (
              <div>
                <p className="mb-2 font-medium text-gray-700">Description</p>
                <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                  {selectedRequest.description}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedRequest.attachments?.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-gray-700">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <FiPaperclip className="h-4 w-4 text-gray-400" />
                      Attachment {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Note */}
            {selectedRequest.resolutionNote && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-medium text-green-800">Resolution Note</p>
                <p className="mt-1 text-green-700">{selectedRequest.resolutionNote}</p>
              </div>
            )}

            {/* Actions */}
            {!["resolved", "closed"].includes(selectedRequest.status) && (
              <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
                {selectedRequest.status === "new" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailModal(false);
                      openUpdateModal(selectedRequest, "acknowledged");
                    }}
                  >
                    Acknowledge
                  </Button>
                )}
                {["new", "acknowledged"].includes(selectedRequest.status) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailModal(false);
                      openUpdateModal(selectedRequest, "in_progress");
                    }}
                  >
                    Mark In Progress
                  </Button>
                )}
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowDetailModal(false);
                    openUpdateModal(selectedRequest, "resolved");
                  }}
                >
                  Mark Resolved
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedRequest(null);
          setNewStatus("");
          setResolutionNote("");
        }}
        title="Update Request Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Update the status to{" "}
            <Badge variant={getStatusConfig(REQUEST_STATUSES, newStatus).color}>
              {getStatusConfig(REQUEST_STATUSES, newStatus).label}
            </Badge>
          </p>
          {(newStatus === "resolved" || newStatus === "closed") && (
            <Textarea
              label="Resolution Note"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe how the issue was resolved..."
              rows={3}
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUpdateModal(false);
                setNewStatus("");
                setResolutionNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} loading={processing}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RequestCard({ request, onViewDetails, onUpdateStatus }) {
  const statusConfig = getStatusConfig(REQUEST_STATUSES, request.status);
  const priorityConfig = getStatusConfig(REQUEST_PRIORITIES, request.priority);
  const isUrgent = request.priority === "urgent" || request.priority === "high";
  const isOpen = !["resolved", "closed"].includes(request.status);

  return (
    <Card className={`${isUrgent && isOpen ? "border-l-4 border-l-red-500" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                isUrgent && isOpen
                  ? "bg-red-100"
                  : request.status === "resolved"
                  ? "bg-green-100"
                  : "bg-gray-100"
              }`}
            >
              <FiTool
                className={`h-5 w-5 ${
                  isUrgent && isOpen
                    ? "text-red-600"
                    : request.status === "resolved"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-1">{request.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
                <Badge variant={priorityConfig.color}>{priorityConfig.label}</Badge>
                <span className="text-sm text-gray-500">
                  {REQUEST_CATEGORIES.find((c) => c.value === request.category)?.label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FiHome className="h-4 w-4" />
                  {request.unit?.unitName || "Unknown Unit"}
                </span>
                <span className="flex items-center gap-1">
                  <FiCalendar className="h-4 w-4" />
                  {formatRelativeDate(request.createdAt?.toDate?.() || request.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
          {isOpen && (
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => onUpdateStatus(request, "resolved")}
            >
              <FiCheck className="h-4 w-4" />
              Resolve
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
