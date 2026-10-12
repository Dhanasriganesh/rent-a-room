import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  EmptyState,
  Card,
  Badge,
  ButtonLink,
  Button,
  Spinner,
  Modal,
} from "../../components/ui";
import {
  FiFileText,
  FiSearch,
  FiHome,
  FiCalendar,
  FiClock,
  FiMessageSquare,
  FiMapPin,
  FiDollarSign,
  FiCheck,
  FiX,
  FiEye,
} from "react-icons/fi";
import { getApplicationsByRenter, getDocument, COLLECTIONS } from "../../lib/firestore";
import { APPLICATION_STATUSES, getStatusConfig, formatDate, formatRelativeDate, formatCurrency } from "../../lib/constants";

export default function RenterApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [user?.uid]);

  const fetchApplications = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getApplicationsByRenter(user.uid);
      // Fetch listing details for each application
      const appsWithDetails = await Promise.all(
        data.map(async (app) => {
          const listing = await getDocument(COLLECTIONS.LISTINGS, app.listingId);
          return { ...app, listing };
        })
      );
      setApplications(appsWithDetails);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeApplications = applications.filter((a) => !["withdrawn", "rejected"].includes(a.status));
  const pastApplications = applications.filter((a) => ["withdrawn", "rejected"].includes(a.status));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Applications"
        subtitle="Track your rental applications and their status"
      />

      {applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={FiFileText}
            title="No applications yet"
            description="When you apply for listings, you can track their status here."
            action={
              <ButtonLink to="/my-home/discover" className="gap-2">
                <FiSearch className="h-4 w-4" />
                Find Homes
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          {/* Active Applications */}
          {activeApplications.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Active Applications ({activeApplications.length})
              </h2>
              <div className="space-y-4">
                {activeApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onViewDetails={() => {
                      setSelectedApp(app);
                      setShowDetailModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Applications */}
          {pastApplications.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Past Applications ({pastApplications.length})
              </h2>
              <div className="space-y-4">
                {pastApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onViewDetails={() => {
                      setSelectedApp(app);
                      setShowDetailModal(true);
                    }}
                  />
                ))}
              </div>
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
            {/* Listing Info */}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                  {selectedApp.listing?.images?.[0] ? (
                    <img
                      src={selectedApp.listing.images[0]}
                      alt={selectedApp.listingTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FiHome className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedApp.listingTitle}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                    <FiMapPin className="h-4 w-4" />
                    {selectedApp.listing?.city}, {selectedApp.listing?.area}
                  </p>
                  <p className="mt-2 text-lg font-bold text-primary">
                    {formatCurrency(selectedApp.listing?.rentAmount)}/month
                  </p>
                </div>
              </div>
            </div>

            {/* Application Status */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div>
                <p className="text-sm text-gray-500">Application Status</p>
                <Badge variant={getStatusConfig(APPLICATION_STATUSES, selectedApp.status).color} className="mt-1">
                  {getStatusConfig(APPLICATION_STATUSES, selectedApp.status).label}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Applied</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedApp.submittedAt?.toDate?.() || selectedApp.submittedAt)}
                </p>
              </div>
            </div>

            {/* Application Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Desired Move-in</p>
                <p className="mt-1 font-medium text-gray-900">{formatDate(selectedApp.desiredMoveIn)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Occupants</p>
                <p className="mt-1 font-medium text-gray-900">{selectedApp.numberOfOccupants || 1}</p>
              </div>
            </div>

            {/* Message */}
            {selectedApp.message && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Your Message</p>
                <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                  {selectedApp.message}
                </div>
              </div>
            )}

            {/* Owner Response */}
            {selectedApp.decisionNote && (
              <div className={`rounded-lg p-4 ${
                selectedApp.status === "accepted" 
                  ? "border border-green-200 bg-green-50" 
                  : selectedApp.status === "rejected"
                  ? "border border-red-200 bg-red-50"
                  : "border border-gray-200"
              }`}>
                <p className={`font-medium ${
                  selectedApp.status === "accepted" 
                    ? "text-green-800" 
                    : selectedApp.status === "rejected"
                    ? "text-red-800"
                    : "text-gray-800"
                }`}>
                  Response from Owner
                </p>
                <p className={`mt-1 ${
                  selectedApp.status === "accepted" 
                    ? "text-green-700" 
                    : selectedApp.status === "rejected"
                    ? "text-red-700"
                    : "text-gray-600"
                }`}>
                  {selectedApp.decisionNote}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-200 pt-4">
              <Link
                to={`/listings/${selectedApp.listingId}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2">
                  <FiEye className="h-4 w-4" />
                  View Listing
                </Button>
              </Link>
              {selectedApp.status !== "withdrawn" && selectedApp.status !== "rejected" && (
                <Button variant="ghost" className="gap-2">
                  <FiMessageSquare className="h-4 w-4" />
                  Message Owner
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ApplicationCard({ application, onViewDetails }) {
  const statusConfig = getStatusConfig(APPLICATION_STATUSES, application.status);
  const isAccepted = application.status === "accepted";
  const isRejected = application.status === "rejected";

  return (
    <Card className={`${isAccepted ? "border-l-4 border-l-green-500" : isRejected ? "border-l-4 border-l-red-500" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
            {application.listing?.images?.[0] ? (
              <img
                src={application.listing.images[0]}
                alt={application.listingTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <FiHome className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{application.listingTitle}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <FiMapPin className="h-4 w-4" />
              {application.listing?.city}, {application.listing?.area}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <FiClock className="h-4 w-4" />
                {formatRelativeDate(application.submittedAt?.toDate?.() || application.submittedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-primary">
            {formatCurrency(application.listing?.rentAmount)}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}
