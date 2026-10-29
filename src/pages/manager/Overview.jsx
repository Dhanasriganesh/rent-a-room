import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { buildOperationalReport } from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Spinner,
  Alert,
  StatsCard,
  ButtonLink,
  SearchBox,
  matchesQuery,
} from "../../components/ui";
import {
  FiHome,
  FiInbox,
  FiKey,
  FiUsers,
  FiTool,
  FiCalendar,
  FiBarChart2,
  FiDollarSign,
  FiActivity,
  FiSettings,
  FiMail,
  FiLink,
} from "react-icons/fi";

function SuperadminAnalytics() {
  const [report, setReport] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await buildOperationalReport({});
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        title="Platform analytics"
        subtitle="Whole-application snapshot — occupancy, rent, pipeline, and delivery"
        actions={
          <ButtonLink to="/manager/reports" variant="outline" size="sm">
            Full report
          </ButtonLink>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <SearchBox value={search} onChange={setSearch} placeholder="Search a section" />

      {report && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <StatsCard label="Properties" value={report.inventory.properties} icon={FiHome} />
            <StatsCard label="Beds" value={report.inventory.beds} icon={FiKey} />
            <StatsCard
              label="Rent outstanding"
              value={Math.round(report.rent.outstanding)}
              icon={FiDollarSign}
            />
            <StatsCard label="Open tickets" value={report.maintenance.open} icon={FiTool} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold text-gray-900">Applications</h3>
              <p className="text-sm text-gray-600">Total: {report.applications.total}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {Object.entries(report.applications.byStatus).map(([k, v]) => (
                  <span key={k} className="rounded-lg bg-white/60 px-3 py-1.5 text-gray-700">
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold text-gray-900">Lifecycle</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Move events: {report.lifecycle.moveEvents}</li>
                <li>Move-ins completed: {report.lifecycle.moveInsCompleted}</li>
                <li>Move-outs completed: {report.lifecycle.moveOutsCompleted}</li>
                <li>Contracts ending (range): {report.lifecycle.contractsEndingSoon}</li>
              </ul>
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold text-gray-900">Rent</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Charged: {Math.round(report.rent.charged)}</li>
                <li>Collected: {Math.round(report.rent.collected)}</li>
                <li>Outstanding: {Math.round(report.rent.outstanding)}</li>
                <li>Overdue: {Math.round(report.rent.overdue)}</li>
              </ul>
            </Card>
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiMail /> Notifications
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Delivery logs: {report.notifications.total}</li>
                <li>Sandbox: {report.notifications.sandbox}</li>
                <li>Failed / blocked: {report.notifications.failed}</li>
              </ul>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
            {[
              { to: "/manager/users", label: "Users", icon: FiUsers, note: "Accounts & roles" },
              { to: "/manager/audit", label: "Audit log", icon: FiActivity, note: "Who changed what" },
              { to: "/manager/settings", label: "Settings", icon: FiSettings, note: "Hardening & flags" },
            ].filter((item) => matchesQuery(search, item.label, item.note)).map((item) => (
              <Card key={item.to}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{item.note}</p>
                  </div>
                  <item.icon className="h-4 w-4 shrink-0 text-[#2C1810] sm:h-5 sm:w-5" />
                </div>
                <Link
                  to={item.to}
                  className="mt-2 inline-block text-xs font-medium text-[#FF8C00] sm:mt-4 sm:text-sm"
                >
                  Open →
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ManagerOpsHome() {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState("");
  const shortcuts = [
    { to: "/manager/owners", label: "Owners", icon: FiUsers, note: "Owner records" },
    { to: "/manager/properties", label: "Properties", icon: FiHome, note: "Portfolio" },
    { to: "/manager/inventory", label: "Rooms & Beds", icon: FiKey, note: "Inventory" },
    { to: "/manager/share-links", label: "Share links", icon: FiLink, note: "Private browse URLs" },
    { to: "/manager/applicants", label: "Applicants", icon: FiInbox, note: "Pipeline" },
    { to: "/manager/allocations", label: "Allocation", icon: FiKey, note: "Beds" },
    { to: "/manager/contracts", label: "Rental Documents", icon: FiBarChart2, note: "Contracts" },
    { to: "/manager/contract-ends", label: "Contract ends", icon: FiCalendar, note: "Who can leave" },
    { to: "/manager/rent", label: "Rent", icon: FiBarChart2, note: "Charges" },
    { to: "/manager/messages", label: "Messages", icon: FiInbox, note: "Inbox" },
    { to: "/manager/whatsapp", label: "WhatsApp", icon: FiInbox, note: "Sandbox" },
    { to: "/manager/maintenance", label: "Maintenance", icon: FiTool, note: "Tickets" },
    { to: "/manager/lifecycle", label: "Move-in/out", icon: FiCalendar, note: "Checklists" },
    { to: "/manager/reports", label: "Reports", icon: FiBarChart2, note: "Operations" },
  ].filter((item) => matchesQuery(search, item.label, item.note));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${userProfile?.displayName?.split(" ")[0] || "Manager"}`}
        subtitle="Day-to-day mediation — owners, inventory, applicants, and rent"
      />

      <SearchBox value={search} onChange={setSearch} placeholder="Search a page" />

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {shortcuts.length === 0 ? (
          <p className="col-span-2 text-sm text-gray-500">No pages match that search.</p>
        ) : shortcuts.map((item) => (
          <Card key={item.to}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-gray-900">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-gray-500 sm:text-xs">{item.note}</p>
              </div>
              <item.icon className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
            </div>
            <Link to={item.to} className="mt-2 inline-block text-xs font-medium text-primary sm:mt-4 sm:text-sm">
              Open →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ManagerOverview() {
  const { userProfile } = useAuth();
  if (userProfile?.role === "admin") {
    return <SuperadminAnalytics />;
  }
  return <ManagerOpsHome />;
}
