import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, updateDocument, createAuditLog } from "../../lib/firestore";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Card,
  Spinner,
  Badge,
  Select,
  Button,
  Alert,
} from "../../components/ui";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setRole = async (userId, role) => {
    if (!confirm(`Set this account role to "${role}"? This is audited.`)) return;
    await updateDocument(COLLECTIONS.USERS, userId, { role });
    await createAuditLog(user.uid, "admin.user.role", "user", userId, `role=${role}`);
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
      <PageHeader
        title="Users"
        subtitle="Renter and owner accounts on the platform"
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Select
        className="max-w-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        options={[
          { value: "", label: "All roles" },
          { value: "admin", label: "Superadmin (platform)" },
          { value: "property_manager", label: "Property manager (ops)" },
          { value: "owner", label: "Owner" },
          { value: "renter", label: "Renter" },
        ]}
      />

      <Alert variant="info">
        Role <strong>admin</strong> opens Platform analytics (superadmin). Role{" "}
        <strong>property_manager</strong> opens the mediation desk (owners, rooms, share links).
      </Alert>

      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} className="!p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">{u.displayName || "—"}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">{u.role}</Badge>
                <Badge variant={u.accountStatus === "suspended" ? "danger" : "success"}>
                  {u.accountStatus || "active"}
                </Badge>
                {u.id !== user.uid && u.role !== "property_manager" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRole(u.id, "property_manager")}
                  >
                    Make manager
                  </Button>
                )}
                {u.id !== user.uid && u.role !== "admin" && (
                  <Button size="sm" variant="outline" onClick={() => setRole(u.id, "admin")}>
                    Make superadmin
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
