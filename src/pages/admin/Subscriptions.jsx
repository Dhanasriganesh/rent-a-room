import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS, getOwnerProfile } from "../../lib/firestore";
import { SUBSCRIPTION_PLANS, formatCurrency } from "../../lib/constants";
import { PageHeader, Card, Spinner, Badge, StatsCard } from "../../components/ui";
import { FiCreditCard } from "react-icons/fi";

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, COLLECTIONS.USERS), where("role", "==", "owner"))
        );
        const data = await Promise.all(
          snap.docs.map(async (d) => {
            const profile = await getOwnerProfile(d.id);
            const plan = SUBSCRIPTION_PLANS.find(
              (p) => p.id === (profile?.subscriptionPlanId || "starter")
            );
            return {
              id: d.id,
              email: d.data().email,
              name: d.data().displayName,
              plan,
              status: profile?.subscriptionStatus || "trial",
            };
          })
        );
        setRows(data);
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

  const mrr = rows.reduce((sum, r) => sum + (r.plan?.price || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Owner SaaS plans — separate from tenant rent collection"
      />
      <StatsCard label="Estimated MRR" value={formatCurrency(mrr)} icon={FiCreditCard} />
      <div className="grid gap-4 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <Card key={plan.id}>
            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(plan.price)}
              <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {rows.filter((r) => r.plan?.id === plan.id).length} owners
            </p>
          </Card>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="!p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-gray-500">{r.email}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="info">{r.plan?.name}</Badge>
                <Badge>{r.status}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
