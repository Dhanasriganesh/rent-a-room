import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute";
import { Spinner } from "./components/ui";

import PublicLayout from "./components/layouts/PublicLayout";

// Auth pages — keep eager for first paint on login
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import SuperadminLogin from "./pages/auth/SuperadminLogin";

import ManagerDashboardLayout from "./components/layouts/ManagerDashboardLayout";
import ManagerOverview from "./pages/manager/Overview";

const OwnerDashboardLayout = lazy(() => import("./components/layouts/OwnerDashboardLayout"));
const RenterDashboardLayout = lazy(() => import("./components/layouts/RenterDashboardLayout"));

const AcceptInvite = lazy(() => import("./pages/auth/AcceptInvite"));
const JoinInvite = lazy(() => import("./pages/auth/JoinInvite"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));

const Home = lazy(() => import("./pages/public/Home"));
const Properties = lazy(() => import("./pages/public/Properties"));
const PublicProperty = lazy(() => import("./pages/public/PublicProperty"));
const Listings = lazy(() => import("./pages/public/Listings"));
const ListingDetail = lazy(() => import("./pages/public/ListingDetail"));
const BrowseLink = lazy(() => import("./pages/public/BrowseLink"));

const OwnerOverview = lazy(() => import("./pages/owner/Overview"));
const OwnerProperties = lazy(() => import("./pages/owner/Properties"));
const OwnerPropertyDetail = lazy(() => import("./pages/owner/PropertyDetail"));
const OwnerListings = lazy(() => import("./pages/owner/Listings"));
const OwnerListingEdit = lazy(() => import("./pages/owner/ListingEdit"));
const OwnerApplications = lazy(() => import("./pages/owner/Applications"));
const OwnerTenancies = lazy(() => import("./pages/owner/Tenancies"));
const OwnerTenants = lazy(() => import("./pages/owner/Tenants"));
const OwnerRent = lazy(() => import("./pages/owner/Rent"));
const OwnerDocuments = lazy(() => import("./pages/owner/Documents"));
const OwnerMessages = lazy(() => import("./pages/owner/Messages"));
const OwnerRequests = lazy(() => import("./pages/owner/Requests"));
const OwnerAnalytics = lazy(() => import("./pages/owner/Analytics"));
const OwnerSettings = lazy(() => import("./pages/owner/Settings"));

const RenterOverview = lazy(() => import("./pages/renter/Overview"));
const RenterDiscover = lazy(() => import("./pages/renter/Discover"));
const RenterSaved = lazy(() => import("./pages/renter/Saved"));
const RenterApplications = lazy(() => import("./pages/renter/Applications"));
const RenterTenancy = lazy(() => import("./pages/renter/Tenancy"));
const RenterRent = lazy(() => import("./pages/renter/Rent"));
const RenterDocuments = lazy(() => import("./pages/renter/Documents"));
const RenterMessages = lazy(() => import("./pages/renter/Messages"));
const RenterRequests = lazy(() => import("./pages/renter/Requests"));
const RenterSettings = lazy(() => import("./pages/renter/Settings"));

const ManagerOwners = lazy(() => import("./pages/manager/Owners"));
const ManagerProperties = lazy(() => import("./pages/manager/Properties"));
const ManagerInventory = lazy(() => import("./pages/manager/Inventory"));
const ManagerShareLinks = lazy(() => import("./pages/manager/ShareLinks"));
const ManagerApplicants = lazy(() => import("./pages/manager/Applicants"));
const ManagerAllocations = lazy(() => import("./pages/manager/Allocations"));
const ManagerContracts = lazy(() => import("./pages/manager/Contracts"));
const ContractEnds = lazy(() => import("./pages/manager/ContractEnds"));
const ManagerRent = lazy(() => import("./pages/manager/Rent"));
const ManagerInbox = lazy(() => import("./pages/manager/Inbox"));
const ManagerWhatsApp = lazy(() => import("./pages/manager/WhatsApp"));
const ManagerMaintenance = lazy(() => import("./pages/manager/Maintenance"));
const ManagerLifecycle = lazy(() => import("./pages/manager/Lifecycle"));
const ManagerReports = lazy(() => import("./pages/manager/Reports"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="properties" element={<Properties />} />
              <Route path="properties/:id" element={<PublicProperty />} />
              <Route path="listings" element={<Listings />} />
              <Route path="listings/:id" element={<ListingDetail />} />
              <Route path="browse/:slug" element={<BrowseLink />} />
              <Route path="owner/:ownerId" element={<Listings />} />
              <Route path="owner/:ownerId/:listingId" element={<ListingDetail />} />
            </Route>

            {/* Auth */}
            <Route
              path="login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="superadmin/login"
              element={
                <PublicOnlyRoute>
                  <SuperadminLogin />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />
            <Route path="invite/:token" element={<AcceptInvite />} />
            <Route path="join/:token" element={<JoinInvite />} />
            <Route path="change-password" element={<ChangePassword />} />

            {/* Owner */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <OwnerDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OwnerOverview />} />
              <Route path="properties" element={<OwnerProperties />} />
              <Route path="properties/:id" element={<OwnerPropertyDetail />} />
              <Route path="listings" element={<OwnerListings />} />
              <Route path="listings/new" element={<OwnerListingEdit />} />
              <Route path="listings/:id/edit" element={<OwnerListingEdit />} />
              <Route path="applications" element={<OwnerApplications />} />
              <Route path="tenancies" element={<OwnerTenancies />} />
              <Route path="tenants" element={<OwnerTenants />} />
              <Route path="rent" element={<OwnerRent />} />
              <Route path="documents" element={<OwnerDocuments />} />
              <Route path="messages" element={<OwnerMessages />} />
              <Route path="requests" element={<OwnerRequests />} />
              <Route path="analytics" element={<OwnerAnalytics />} />
              <Route path="settings/*" element={<OwnerSettings />} />
            </Route>

            {/* Renters */}
            <Route
              path="my-home"
              element={
                <ProtectedRoute allowedRoles={["renter"]}>
                  <RenterDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RenterOverview />} />
              <Route path="discover" element={<RenterDiscover />} />
              <Route path="saved" element={<RenterSaved />} />
              <Route path="applications" element={<RenterApplications />} />
              <Route path="tenancy" element={<RenterTenancy />} />
              <Route path="rent" element={<RenterRent />} />
              <Route path="documents" element={<RenterDocuments />} />
              <Route path="messages" element={<RenterMessages />} />
              <Route path="requests" element={<RenterRequests />} />
              <Route path="settings/*" element={<RenterSettings />} />
            </Route>

            {/* Staff desk */}
            <Route
              path="manager"
              element={
                <ProtectedRoute allowedRoles={["admin", "property_manager"]}>
                  <ManagerDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManagerOverview />} />
              <Route
                path="owners"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerOwners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="properties"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerInventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="share-links"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerShareLinks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="applicants"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerApplicants />
                  </ProtectedRoute>
                }
              />
              <Route
                path="allocations"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerAllocations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="contracts"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerContracts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="contract-ends"
                element={
                  <ProtectedRoute allowedRoles={["admin", "property_manager"]}>
                    <ContractEnds />
                  </ProtectedRoute>
                }
              />
              <Route
                path="rent"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerRent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="messages"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerInbox />
                  </ProtectedRoute>
                }
              />
              <Route
                path="whatsapp"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerWhatsApp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="maintenance"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerMaintenance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="lifecycle"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <ManagerLifecycle />
                  </ProtectedRoute>
                }
              />
              <Route path="reports" element={<ManagerReports />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="admin" element={<Navigate to="/manager" replace />} />
            <Route path="admin/*" element={<Navigate to="/manager" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
