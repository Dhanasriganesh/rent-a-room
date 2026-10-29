import { useEffect, useState } from "react";
import { queryDocuments, COLLECTIONS } from "../../lib/firestore";
import { formatRelativeDate } from "../../lib/constants";
import { PageHeader, Card, Spinner, EmptyState, SearchBox, matchesQuery } from "../../components/ui";
import { FiActivity } from "react-icons/fi";

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    queryDocuments(COLLECTIONS.AUDIT_LOGS, [], { field: "createdAt", direction: "desc" }, 100)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
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
      <PageHeader title="Audit logs" subtitle="Privileged and sensitive actions" />
      <SearchBox value={search} onChange={setSearch} placeholder="Search action, person, or reason" />
      {logs.length === 0 ? (
        <Card>
          <EmptyState icon={FiActivity} title="No audit events" description="Actions will appear here as the platform is used." />
        </Card>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.filter((log) =>
                matchesQuery(search, log.action, log.actorUserId, log.entityType, log.entityId, log.reason)
              ).map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-gray-500">
                    {formatRelativeDate(toDate(log.createdAt))}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.actorUserId?.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.entityType} / {log.entityId?.slice?.(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
