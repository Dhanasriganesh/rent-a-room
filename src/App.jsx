import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute";

// Layouts
import PublicLayout from "./components/layouts/PublicLayout";
import OwnerDashboardLayout from "./components/layouts/OwnerDashboardLayout";
import RenterDashboardLayout from "./components/layouts/RenterDashboardLayout";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import AcceptInvite from "./pages/auth/AcceptInvite";
import JoinInvite from "./pages/auth/JoinInvite";
import ChangePassword from "./pages/auth/ChangePassword";
import SuperadminLogin from "./pages/auth/SuperadminLogin";

// Public Pages
import Home from "./pages/public/Home";
import Listings from "./pages/public/Listings";
import ListingDetail from "./pages/public/ListingDetail";
import BrowseLink from "./pages/public/BrowseLink";

// Owner Dashboard Pages
import OwnerOverview from "./pages/owner/Overview";
import OwnerProperties from "./pages/owner/Properties";
import OwnerPropertyDetail from "./pages/owner/PropertyDetail";
import OwnerListings from "./pages/owner/Listings";
import OwnerListingEdit from "./pages/owner/ListingEdit";
import OwnerApplications from "./pages/owner/Applications";
import OwnerTenancies from "./pages/owner/Tenancies";
import OwnerTenants from "./pages/owner/Tenants";
import OwnerRent from "./pages/owner/Rent";
import OwnerDocuments from "./pages/owner/Documents";
import OwnerMessages from "./pages/owner/Messages";
import OwnerRequests from "./pages/owner/Requests";
import OwnerAnalytics from "./pages/owner/Analytics";
import OwnerSettings from "./pages/owner/Settings";

// Renter Dashboard Pages
import RenterOverview from "./pages/renter/Overview";
import RenterDiscover from "./pages/renter/Discover";
import RenterSaved from "./pages/renter/Saved";
import RenterApplications from "./pages/renter/Applications";
import RenterTenancy from "./pages/renter/Tenancy";
import RenterRent from "./pages/renter/Rent";
import RenterDocuments from "./pages/renter/Documents";
import RenterMessages from "./pages/renter/Messages";
import RenterRequests from "./pages/renter/Requests";
import RenterSettings from "./pages/renter/Settings";

// Single staff desk (admin = the manager)
import ManagerDashboardLayout from "./components/layouts/ManagerDashboardLayout";
import ManagerOverview from "./pages/manager/Overview";
import ManagerOwners from "./pages/manager/Owners";
import ManagerProperties from "./pages/manager/Properties";
import ManagerInventory from "./pages/manager/Inventory";
import ManagerShareLinks from "./pages/manager/ShareLinks";
import ManagerApplicants from "./pages/manager/Applicants";
import ManagerAllocations from "./pages/manager/Allocations";
import ManagerContracts from "./pages/manager/Contracts";
import ManagerRent from "./pages/manager/Rent";
import ManagerInbox from "./pages/manager/Inbox";
import ManagerWhatsApp from "./pages/manager/WhatsApp";
import ManagerMaintenance from "./pages/manager/Maintenance";
import ManagerLifecycle from "./pages/manager/Lifecycle";
import ManagerReports from "./pages/manager/Reports";
import AdminUsers from "./pages/admin/Users";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/Settings";

// Other
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
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

          {/* Owner (property-owner login — separate from admin CRM owners) */}
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

          {/* Users (renters) */}
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

          {/* Single admin desk — you are the manager */}
          <Route
            path="manager"
            element={
              <ProtectedRoute allowedRoles={["admin", "property_manager"]}>
                <ManagerDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ManagerOverview />} />
            {/* Operations — property managers only (not superadmin) */}
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
            {/* Analytics — both roles */}
            <Route path="reports" element={<ManagerReports />} />
            {/* Superadmin control plane */}
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

          {/* Old /admin URLs → same desk */}
          <Route path="admin" element={<Navigate to="/manager" replace />} />
          <Route path="admin/*" element={<Navigate to="/manager" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
