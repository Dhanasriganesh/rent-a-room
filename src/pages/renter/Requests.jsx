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
  Textarea,
  Select,
  Spinner,
} from "../../components/ui";
import {
  FiTool,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiMessageSquare,
  FiCalendar,
  FiAlertCircle,
  FiPaperclip,
  FiImage,
} from "react-icons/fi";
import { queryDocuments, createRequest, getDocument, COLLECTIONS } from "../../lib/firestore";
import {
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  REQUEST_CATEGORIES,
  getStatusConfig,
  formatDate,
  formatRelativeDate,
} from "../../lib/constants";

export default function RenterRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [tenancy, setTenancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: "repair",
    priority: "medium",
    title: "",
    description: "",
    preferredTimes: "",
  });

  useEffect(() => {
    fetchRequests();
  }, [user?.uid]);

  const fetchRequests = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Find active tenancy membership
      const memberships = await queryDocuments(
        COLLECTIONS.TENANCY_MEMBERS,
        [
          { field: "tenantUserId", operator: "==", value: user.uid },
          { field: "status", operator: "==", value: "active" },
        ]
      );

      if (memberships.length > 0) {
        const membership = memberships[0];
        const tenancyData = await getDocument(COLLECTIONS.TENANCIES, membership.tenancyId);
        setTenancy(tenancyData);

        // Get requests for this tenancy
        const requestsData = await queryDocuments(
          COLLECTIONS.REQUESTS,
          [{ field: "tenancyId", operator: "==", value: membership.tenancyId }],
          { field: "createdAt", direction: "desc" }
        );
        setRequests(requestsData);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!tenancy) return;
    setSubmitting(true);
    try {
      await createRequest(tenancy.id, user.uid, {
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        preferredTimes: formData.preferredTimes,
      });
      await fetchRequests();
      setShowNewModal(false);
      setFormData({
        category: "repair",
        priority: "medium",
        title: "",
        description: "",
        preferredTimes: "",
      });
    } catch (error) {
      console.error("Error submitting request:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tenancy) {
    return (
      <div className="space-y-6">
        <PageHeader title="Maintenance Requests" subtitle="Submit and track maintenance requests" />
        <Card>
          <EmptyState
            icon={FiTool}
            title="No active tenancy"
            description="You need an active tenancy to submit maintenance requests."
          />
        </Card>
      </div>
    );
  }

  const openRequests = requests.filter((r) => !["resolved", "closed"].includes(r.status));
  const closedRequests = requests.filter((r) => ["resolved", "closed"].includes(r.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Submit and track maintenance requests for your rental"
        actions={
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <FiPlus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{openRequests.length}</p>
          <p className="text-sm text-gray-500">Open Requests</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-amber-600">
            {requests.filter((r) => r.status === "in_progress").length}
          </p>
          <p className="text-sm text-gray-500">In Progress</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-green-600">{closedRequests.length}</p>
          <p className="text-sm text-gray-500">Resolved</p>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiTool}
            title="No maintenance requests"
            description="Need something fixed? Submit a maintenance request and we'll take care of it."
            action={
              <Button onClick={() => setShowNewModal(true)} className="gap-2">
                <FiPlus className="h-4 w-4" />
                Submit Request
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Open Requests */}
          {openRequests.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Open Requests</h2>
              <div className="space-y-4">
                {openRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={() => {
                      setSelectedRequest(request);
                      setShowDetailModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Closed Requests */}
          {closedRequests.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Resolved Requests</h2>
              <div className="space-y-4">
                {closedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={() => {
                      setSelectedRequest(request);
                      setShowDetailModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* New Request Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Submit Maintenance Request"
        size="lg"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              options={REQUEST_CATEGORIES}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <Select
              label="Priority"
              options={REQUEST_PRIORITIES}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              required
            />
          </div>

          <Input
            label="Issue Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Leaky faucet in bathroom"
            required
          />

          <Textarea
            label="Description *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please describe the issue in detail. Include when it started, how it affects you, and any relevant information..."
            rows={4}
            required
          />

          <Input
            label="Preferred Times for Repair (optional)"
            value={formData.preferredTimes}
            onChange={(e) => setFormData({ ...formData, preferredTimes: e.target.value })}
            placeholder="e.g., Weekdays after 5pm, or weekends"
          />

          {/* Photo Upload Placeholder */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Photos (optional)
            </label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6">
              <div className="text-center">
                <FiImage className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Drag and drop photos here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PNG, JPG up to 10MB each
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

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
                  {REQUEST_CATEGORIES.find((c) => c.value === selectedRequest.category)?.label}
                </Badge>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <FiCalendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.createdAt?.toDate?.() || selectedRequest.createdAt)}
                  </p>
                </div>
              </div>
              {selectedRequest.resolvedAt && (
                <div className="mt-3 flex items-center gap-3">
                  <FiCheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Resolved</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedRequest.resolvedAt?.toDate?.() || selectedRequest.resolvedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="mb-2 font-medium text-gray-700">Description</p>
              <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                {selectedRequest.description}
              </div>
            </div>

            {/* Preferred Times */}
            {selectedRequest.preferredTimes && (
              <div>
                <p className="mb-2 font-medium text-gray-700">Your Preferred Times</p>
                <p className="text-gray-600">{selectedRequest.preferredTimes}</p>
              </div>
            )}

            {/* Resolution */}
            {selectedRequest.resolutionNote && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-medium text-green-800">Resolution Note</p>
                <p className="mt-1 text-green-700">{selectedRequest.resolutionNote}</p>
              </div>
            )}

            {/* Actions */}
            {!["resolved", "closed"].includes(selectedRequest.status) && (
              <div className="flex gap-3 border-t border-gray-200 pt-4">
                <Button variant="outline" className="gap-2">
                  <FiMessageSquare className="h-4 w-4" />
                  Add Comment
                </Button>
                <Button variant="outline" className="gap-2">
                  <FiPaperclip className="h-4 w-4" />
                  Add Photo
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function RequestCard({ request, onViewDetails }) {
  const statusConfig = getStatusConfig(REQUEST_STATUSES, request.status);
  const priorityConfig = getStatusConfig(REQUEST_PRIORITIES, request.priority);
  const isUrgent = request.priority === "urgent" || request.priority === "high";
  const isOpen = !["resolved", "closed"].includes(request.status);

  return (
    <Card className={`${isUrgent && isOpen ? "border-l-4 border-l-red-500" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              request.status === "resolved"
                ? "bg-green-100"
                : isUrgent
                ? "bg-red-100"
                : "bg-gray-100"
            }`}
          >
            {request.status === "resolved" ? (
              <FiCheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <FiTool
                className={`h-5 w-5 ${isUrgent ? "text-red-600" : "text-gray-600"}`}
              />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{request.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
              <Badge variant={priorityConfig.color}>{priorityConfig.label}</Badge>
              <span className="text-sm text-gray-500">
                {REQUEST_CATEGORIES.find((c) => c.value === request.category)?.label}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-gray-400">
              <FiClock className="h-4 w-4" />
              {formatRelativeDate(request.createdAt?.toDate?.() || request.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          View Details
        </Button>
      </div>
    </Card>
  );
}
