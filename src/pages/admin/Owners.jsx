import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  COLLECTIONS,
  updateDocument,
  createDocumentWithId,
  createAuditLog,
  getOwnerProfile,
} from "../../lib/firestore";
import { useAuth } from "../../context/AuthContext";
import { SUBSCRIPTION_PLANS, formatDate } from "../../lib/constants";
import { ACCOUNT_STATUS, SUBSCRIPTION_STATUS } from "../../lib/statuses";
import {
  PageHeader,
  Card,
  Spinner,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  Alert,
} from "../../components/ui";
import { serverTimestamp } from "firebase/firestore";

export default function AdminOwners() {
  const { user } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({
    email: "",
    displayName: "",
    planId: "starter",
  });
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.USERS), where("role", "==", "owner"))
      );
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const profile = await getOwnerProfile(d.id);
          return { id: d.id, ...d.data(), profile };
        })
      );
      setOwners(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (ownerId, accountStatus) => {
    setSaving(true);
    try {
      await updateDocument(COLLECTIONS.USERS, ownerId, { accountStatus });
      await createAuditLog(user.uid, "admin.owner.status", "user", ownerId, accountStatus);
      await load();
      setSelected(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const setPlan = async (ownerId, planId) => {
    setSaving(true);
    try {
      await updateDocument(COLLECTIONS.OWNER_PROFILES, ownerId, {
        subscriptionPlanId: planId,
        subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
      });
      await createAuditLog(user.uid, "admin.owner.plan", "owner_profile", ownerId, planId);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createInvitePlaceholder = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      // MVP: create a pending owner profile stub keyed by email hash placeholder.
      // Real invite uses Firebase Admin SDK / email link — document the manual path.
      const slug = invite.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32) || "owner";

      const tempId = `invite_${Date.now()}`;
      await createDocumentWithId(COLLECTIONS.OWNER_PROFILES, tempId, {
        userId: tempId,
        invitedEmail: invite.email.trim().toLowerCase(),
        siteName: invite.displayName,
        publicSlug: `${slug}-${String(Date.now()).slice(-4)}`,
        verificationStatus: "pending",
        subscriptionPlanId: invite.planId,
        subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
        publicationStatus: "unpublished",
        inviteStatus: ACCOUNT_STATUS.INVITED,
        brandSettings: {
          primaryColor: "#1a3c32",
          contactEmail: invite.email.trim().toLowerCase(),
        },
        createdAt: serverTimestamp(),
      });

      await createAuditLog(user.uid, "admin.owner.invite", "owner_profile", tempId, null, {
        email: invite.email,
        planId: invite.planId,
      });

      setMessage(
        `Invite recorded for ${invite.email}. Ask them to register with that email as Owner, then link/activate in Users. Full email invite requires Firebase Admin SDK.`
      );
      setInviteOpen(false);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

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
        title="Owner management"
        subtitle="Assign plans, suspend accounts, and track onboarding"
        actions={
          <Button onClick={() => setInviteOpen(true)}>Record owner invite</Button>
        }
      />

      {message && <Alert variant="success">{message}</Alert>}

      <div className="space-y-3">
        {owners.map((owner) => (
          <Card key={owner.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{owner.displayName}</p>
                <p className="text-sm text-gray-500">
                  {owner.email} · slug {owner.profile?.publicSlug || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      owner.accountStatus === "active"
                        ? "success"
                        : owner.accountStatus === "suspended"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {owner.accountStatus || "active"}
                  </Badge>
                  <Badge variant="info">
                    plan: {owner.profile?.subscriptionPlanId || "starter"}
                  </Badge>
                  <Badge variant="default">
                    sub: {owner.profile?.subscriptionStatus || "trial"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={owner.profile?.subscriptionPlanId || "starter"}
                  onChange={(e) => setPlan(owner.id, e.target.value)}
                  options={SUBSCRIPTION_PLANS.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  className="w-40"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(owner)}
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Owner account">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selected.displayName} · joined {formatDate(selected.createdAt?.toDate?.() || selected.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                loading={saving}
                onClick={() => setStatus(selected.id, ACCOUNT_STATUS.ACTIVE)}
              >
                Activate
              </Button>
              <Button
                variant="danger"
                loading={saving}
                onClick={() => setStatus(selected.id, ACCOUNT_STATUS.SUSPENDED)}
              >
                Suspend
              </Button>
            </div>
            <Alert variant="info">
              Privileged actions are written to audit_logs. Do not access tenant documents without a support reason.
            </Alert>
          </div>
        )}
      </Modal>

      <Modal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} title="Record owner invite">
        <form onSubmit={createInvitePlaceholder} className="space-y-4">
          <Input
            label="Owner email"
            type="email"
            required
            value={invite.email}
            onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            label="Display / brand name"
            required
            value={invite.displayName}
            onChange={(e) => setInvite((p) => ({ ...p, displayName: e.target.value }))}
          />
          <Select
            label="Initial plan"
            value={invite.planId}
            onChange={(e) => setInvite((p) => ({ ...p, planId: e.target.value }))}
            options={SUBSCRIPTION_PLANS.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Button type="submit" loading={saving}>
            Save invite record
          </Button>
        </form>
      </Modal>
    </div>
  );
}
