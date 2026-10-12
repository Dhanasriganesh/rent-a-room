import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  Button,
  Modal,
  Textarea,
  Select,
  Spinner,
  Input,
  Avatar,
} from "../../components/ui";
import {
  FiInbox,
  FiUser,
  FiHome,
  FiCalendar,
  FiFilter,
  FiSearch,
  FiMessageSquare,
  FiCheck,
  FiX,
  FiEye,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiDollarSign,
  FiUsers,
  FiClock,
} from "react-icons/fi";
import {
  getApplicationsByOwner,
  updateApplicationStatus,
  getDocument,
  COLLECTIONS,
} from "../../lib/firestore";
import {
  APPLICATION_STATUSES,
  getStatusConfig,
  formatDate,
  formatRelativeDate,
  formatCurrency,
} from "../../lib/constants";

export default function OwnerApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user?.uid]);

  const fetchApplications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getApplicationsByOwner(user.uid);
      // Fetch renter details for each application
      const appsWithDetails = await Promise.all(
        data.map(async (app) => {
          const renter = await getDocument(COLLECTIONS.USERS, app.renterId);
          return { ...app, renter };
        })
      );
      setApplications(appsWithDetails);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedApp || !actionType) return;
    setProcessing(true);
    try {
      await updateApplicationStatus(selectedApp.id, actionType, actionNote);
      await fetchApplications();
      setShowActionModal(false);
      setSelectedApp(null);
      setActionType(null);
      setActionNote("");
    } catch (error) {
      console.error("Error updating application:", error);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (app, type) => {
    setSelectedApp(app);
    setActionType(type);
    setShowActionModal(true);
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.renter?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    new: applications.filter((a) => a.status === "new").length,
    inReview: applications.filter((a) => a.status === "in_review" || a.status === "viewing_requested").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
  };

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
        title="Applications"
        subtitle="Review and manage rental applications for your listings"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Applications</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
          <p className="text-sm text-gray-500">New</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.inReview}</p>
          <p className="text-sm text-gray-500">In Review</p>
        </Card>
        <Card className="border-l-4 border-l-green-500 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
          <p className="text-sm text-gray-500">Accepted</p>
        </Card>
      </div>

      {applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiInbox}
            title="No applications yet"
            description="When renters apply for your listings, they'll appear here for you to review."
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
                placeholder="Search by applicant or listing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: "", label: "All Statuses" },
                ...APPLICATION_STATUSES,
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <Card>
              <EmptyState
                icon={FiSearch}
                title="No applications found"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onViewDetails={() => {
                    setSelectedApp(app);
                    setShowDetailModal(true);
                  }}
                  onAccept={() => openActionModal(app, "accepted")}
                  onReject={() => openActionModal(app, "rejected")}
                  onRequestViewing={() => openActionModal(app, "viewing_requested")}
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
          setSelectedApp(null);
        }}
        title="Application Details"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-6">
            {/* Applicant Info */}
            <div className="flex items-start gap-4">
              <Avatar
                name={selectedApp.renter?.displayName || "Unknown"}
                size="lg"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedApp.renter?.displayName || "Unknown Applicant"}
                </h3>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {selectedApp.renter?.email && (
                    <span className="flex items-center gap-1">
                      <FiMail className="h-4 w-4" />
                      {selectedApp.renter.email}
                    </span>
                  )}
                  {selectedApp.renter?.phone && (
                    <span className="flex items-center gap-1">
                      <FiPhone className="h-4 w-4" />
                      {selectedApp.renter.phone}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant={getStatusConfig(APPLICATION_STATUSES, selectedApp.status).color}>
                {getStatusConfig(APPLICATION_STATUSES, selectedApp.status).label}
              </Badge>
            </div>

            {/* Listing Info */}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Applied for</p>
              <p className="mt-1 font-semibold text-gray-900">{selectedApp.listingTitle}</p>
              <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                <FiCalendar className="h-4 w-4" />
                Applied {formatRelativeDate(selectedApp.submittedAt?.toDate?.() || selectedApp.submittedAt)}
              </p>
            </div>

            {/* Application Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <FiCalendar className="h-4 w-4" />
                  Desired Move-in
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(selectedApp.desiredMoveIn)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <FiUsers className="h-4 w-4" />
                  Occupants
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedApp.numberOfOccupants || 1} {selectedApp.numberOfOccupants > 1 ? "people" : "person"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <FiBriefcase className="h-4 w-4" />
                  Occupation
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedApp.occupation || "Not specified"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <FiDollarSign className="h-4 w-4" />
                  Monthly Income
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedApp.monthlyIncome ? formatCurrency(selectedApp.monthlyIncome) : "Not specified"}
                </p>
              </div>
            </div>

            {selectedApp.hasPets && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-800">Has Pets</p>
                <p className="mt-1 text-sm text-amber-700">
                  {selectedApp.petDetails || "No details provided"}
                </p>
              </div>
            )}

            {selectedApp.message && (
              <div>
                <p className="mb-2 font-medium text-gray-700">Message from Applicant</p>
                <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                  {selectedApp.message}
                </div>
              </div>
            )}

            {selectedApp.decisionNote && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="font-medium text-gray-700">Your Note</p>
                <p className="mt-1 text-gray-600">{selectedApp.decisionNote}</p>
              </div>
            )}

            {/* Actions */}
            {selectedApp.status === "new" || selectedApp.status === "in_review" ? (
              <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setShowDetailModal(false);
                    openActionModal(selectedApp, "viewing_requested");
                  }}
                >
                  <FiEye className="h-4 w-4" />
                  Schedule Viewing
                </Button>
                <Button
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowDetailModal(false);
                    openActionModal(selectedApp, "accepted");
                  }}
                >
                  <FiCheck className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  variant="danger"
                  className="gap-2"
                  onClick={() => {
                    setShowDetailModal(false);
                    openActionModal(selectedApp, "rejected");
                  }}
                >
                  <FiX className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setSelectedApp(null);
          setActionType(null);
          setActionNote("");
        }}
        title={
          actionType === "accepted"
            ? "Accept Application"
            : actionType === "rejected"
            ? "Reject Application"
            : "Schedule Viewing"
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {actionType === "accepted" && (
              <>
                You're about to accept the application from{" "}
                <strong>{selectedApp?.renter?.displayName}</strong>. Add an optional note below.
              </>
            )}
            {actionType === "rejected" && (
              <>
                You're about to reject the application from{" "}
                <strong>{selectedApp?.renter?.displayName}</strong>. Please provide a reason (optional).
              </>
            )}
            {actionType === "viewing_requested" && (
              <>
                Request a viewing with <strong>{selectedApp?.renter?.displayName}</strong>. Add details about available times.
              </>
            )}
          </p>
          <Textarea
            label="Note (optional)"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder={
              actionType === "viewing_requested"
                ? "e.g., Available for viewing on weekdays between 10am-6pm..."
                : "Add a note..."
            }
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowActionModal(false);
                setActionNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "rejected" ? "danger" : "primary"}
              onClick={handleStatusUpdate}
              loading={processing}
            >
              {actionType === "accepted" && "Accept"}
              {actionType === "rejected" && "Reject"}
              {actionType === "viewing_requested" && "Send Request"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ApplicationCard({ application, onViewDetails, onAccept, onReject }) {
  const statusConfig = getStatusConfig(APPLICATION_STATUSES, application.status);
  const isNew = application.status === "new";
  const canTakeAction = application.status === "new" || application.status === "in_review";

  return (
    <Card className={`${isNew ? "border-l-4 border-l-blue-500" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar name={application.renter?.displayName || "Unknown"} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                {application.renter?.displayName || "Unknown Applicant"}
              </h3>
              {isNew && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  New
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <FiHome className="h-4 w-4" />
              {application.listingTitle}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
              <FiClock className="h-4 w-4" />
              {formatRelativeDate(application.submittedAt?.toDate?.() || application.submittedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
            {canTakeAction && (
              <>
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={onAccept}
                >
                  <FiCheck className="h-4 w-4" />
                  Accept
                </Button>
                <Button variant="danger" size="sm" className="gap-1" onClick={onReject}>
                  <FiX className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
