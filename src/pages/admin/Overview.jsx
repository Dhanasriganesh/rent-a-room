import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, queryDocuments } from "../../lib/firestore";
import { PageHeader, Card, StatsCard, Spinner, ButtonLink } from "../../components/ui";
import { FiUsers, FiHome, FiList, FiActivity } from "react-icons/fi";

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    owners: 0,
    renters: 0,
    listings: 0,
    audit: 0,
  });
  const [recentAudit, setRecentAudit] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [usersSnap, ownersSnap, rentersSnap, listingsSnap, audit] = await Promise.all([
          getDocs(collection(db, COLLECTIONS.USERS)),
          getDocs(query(collection(db, COLLECTIONS.USERS), where("role", "==", "owner"))),
          getDocs(query(collection(db, COLLECTIONS.USERS), where("role", "==", "renter"))),
          getDocs(query(collection(db, COLLECTIONS.LISTINGS), where("status", "==", "published"))),
          queryDocuments(COLLECTIONS.AUDIT_LOGS, [], { field: "createdAt", direction: "desc" }, 8),
        ]);
        setStats({
          users: usersSnap.size,
          owners: ownersSnap.size,
          renters: rentersSnap.size,
          listings: listingsSnap.size,
          audit: audit.length,
        });
        setRecentAudit(audit);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
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
        title="Platform admin"
        subtitle="Provision owners, monitor subscriptions, and review audit activity"
      />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatsCard label="Users" value={String(stats.users)} icon={FiUsers} />
        <StatsCard label="Owners" value={String(stats.owners)} icon={FiHome} />
        <StatsCard label="Renters" value={String(stats.renters)} icon={FiUsers} />
        <StatsCard label="Published listings" value={String(stats.listings)} icon={FiList} />
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/admin/owners">Manage owners</ButtonLink>
        <ButtonLink to="/admin/subscriptions" variant="outline">
          Subscriptions
        </ButtonLink>
        <ButtonLink to="/admin/audit" variant="outline">
          Audit logs
        </ButtonLink>
      </div>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FiActivity /> Recent audit events
        </h2>
        <div className="divide-y divide-gray-100 text-sm">
          {recentAudit.length === 0 ? (
            <p className="text-gray-500">No audit events yet.</p>
          ) : (
            recentAudit.map((row) => (
              <div key={row.id} className="flex justify-between gap-3 py-2">
                <span className="font-medium text-gray-900">{row.action}</span>
                <span className="text-gray-500">
                  {row.entityType}/{row.entityId?.slice?.(0, 8)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
