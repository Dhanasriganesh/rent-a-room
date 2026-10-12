import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/ProtectedRoute";

// Layouts
import PublicLayout from "./components/layouts/PublicLayout";
import OwnerDashboardLayout from "./components/layouts/OwnerDashboardLayout";
import RenterDashboardLayout from "./components/layouts/RenterDashboardLayout";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// Public Pages
import Home from "./pages/public/Home";
import Listings from "./pages/public/Listings";
import ListingDetail from "./pages/public/ListingDetail";

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

// Other
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/:id" element={<ListingDetail />} />
            <Route path="owner/:ownerId" element={<Listings />} />
            <Route path="owner/:ownerId/:listingId" element={<ListingDetail />} />
          </Route>

          {/* Auth Routes */}
          <Route
            path="login"
            element={
              <PublicOnlyRoute>
                <Login />
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

          {/* Owner Dashboard Routes */}
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

          {/* Renter Dashboard Routes */}
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

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
