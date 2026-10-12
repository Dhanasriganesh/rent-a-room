import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, updateDocument, createAuditLog } from "../../lib/firestore";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, Card, Spinner, Badge, Select, Button } from "../../components/ui";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const promoteAdmin = async (userId) => {
    if (!confirm("Grant platform admin role to this user?")) return;
    await updateDocument(COLLECTIONS.USERS, userId, { role: "admin" });
    await createAuditLog(user.uid, "admin.user.promote", "user", userId, "role=admin");
    await load();
  };

  const filtered = users.filter((u) => !filter || u.role === filter);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="All platform accounts" />
      <Select
        className="max-w-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        options={[
          { value: "admin", label: "Admin" },
          { value: "owner", label: "Owner" },
          { value: "renter", label: "Renter" },
        ]}
        placeholder="All roles"
      />
      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} className="!p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">{u.displayName || "—"}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{u.role}</Badge>
                <Badge variant={u.accountStatus === "suspended" ? "danger" : "success"}>
                  {u.accountStatus || "active"}
                </Badge>
                {u.role !== "admin" && (
                  <Button size="sm" variant="outline" onClick={() => promoteAdmin(u.id)}>
                    Make admin
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
