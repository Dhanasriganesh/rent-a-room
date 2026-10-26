import { useState } from "react";
import { buildOperationalReport } from "../../lib/firestore";
import {
  PageHeader,
  Card,
  Button,
  Spinner,
  Input,
  Alert,
  StatsCard,
} from "../../components/ui";
import {
  FiBarChart2,
  FiHome,
  FiDollarSign,
  FiTool,
  FiCalendar,
  FiMail,
} from "react-icons/fi";

export default function ManagerReports() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await buildOperationalReport({
        fromDate: fromDate || null,
        toDate: toDate || null,
      });
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to build report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational reports"
        subtitle="Occupancy, rent, lifecycle, maintenance, and delivery — staff desk only"
      />

      <Card className="!p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Button onClick={run} loading={loading} className="gap-2 sm:mb-0.5">
            <FiBarChart2 /> Generate
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Date range filters move-in dates and contract end dates. Other totals are live snapshot.
          Timezone: Europe/Berlin.
        </p>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">
            Generated {report.generatedAt?.slice(0, 19).replace("T", " ")} ·{" "}
            {report.timezone}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Beds"
              value={report.inventory.beds}
              icon={FiHome}
            />
            <StatsCard
              label="Occupancy (avg %)"
              value={
                report.inventory.occupancyByProperty.length
                  ? Math.round(
                      report.inventory.occupancyByProperty.reduce(
                        (a, p) => a + p.occupancyRate,
                        0
                      ) / report.inventory.occupancyByProperty.length
                    )
                  : 0
              }
              icon={FiHome}
            />
            <StatsCard
              label="Rent outstanding"
              value={Math.round(report.rent.outstanding)}
              icon={FiDollarSign}
            />
            <StatsCard
              label="Open tickets"
              value={report.maintenance.open}
              icon={FiTool}
            />
          </div>

          <Card>
            <h3 className="mb-3 font-semibold text-gray-900">Inventory by status</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(report.inventory.bedsByStatus).map(([k, v]) => (
                <span key={k} className="rounded-lg bg-gray-50 px-3 py-1.5 text-gray-700">
                  {k}: <strong>{v}</strong>
                </span>
              ))}
            </div>
            {report.inventory.occupancyByProperty.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-400">
                    <tr>
                      <th className="py-2 pr-4">Property</th>
                      <th className="py-2 pr-4">Beds</th>
                      <th className="py-2 pr-4">Occupied</th>
                      <th className="py-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.inventory.occupancyByProperty.map((p) => (
                      <tr key={p.propertyId} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{p.name}</td>
                        <td className="py-2 pr-4">{p.totalBeds}</td>
                        <td className="py-2 pr-4">{p.occupied}</td>
                        <td className="py-2">{p.occupancyRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiCalendar /> Lifecycle
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Upcoming move-ins (range): {report.lifecycle.upcomingMoveIns}</li>
                <li>Contracts ending (range): {report.lifecycle.contractsEndingSoon}</li>
                <li>Move events total: {report.lifecycle.moveEvents}</li>
                <li>Move-ins completed: {report.lifecycle.moveInsCompleted}</li>
                <li>Move-outs completed: {report.lifecycle.moveOutsCompleted}</li>
              </ul>
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiDollarSign /> Rent
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Charged: {Math.round(report.rent.charged)}</li>
                <li>Collected: {Math.round(report.rent.collected)}</li>
                <li>Outstanding: {Math.round(report.rent.outstanding)}</li>
                <li>Overdue: {Math.round(report.rent.overdue)}</li>
              </ul>
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiTool /> Maintenance
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Total tickets: {report.maintenance.total}</li>
                <li>Open: {report.maintenance.open}</li>
                <li>Urgent open: {report.maintenance.urgentOpen}</li>
                <li>
                  Avg resolution (h):{" "}
                  {report.maintenance.avgResolutionHours ?? "—"}
                </li>
              </ul>
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiMail /> Notifications
              </h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>Delivery log rows: {report.notifications.total}</li>
                <li>Sandbox: {report.notifications.sandbox}</li>
                <li>Failed / blocked: {report.notifications.failed}</li>
              </ul>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-semibold text-gray-900">Applications by status</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(report.applications.byStatus).map(([k, v]) => (
                <span key={k} className="rounded-lg bg-gray-50 px-3 py-1.5 text-gray-700">
                  {k}: <strong>{v}</strong>
                </span>
              ))}
              {!Object.keys(report.applications.byStatus).length && (
                <span className="text-gray-500">No applications</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
