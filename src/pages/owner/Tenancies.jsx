import { PageHeader, Card, EmptyState } from "../../components/ui";
import { FiUsers } from "react-icons/fi";

export default function OwnerTenancies() {
  return (
    <div>
      <PageHeader title="Tenancies" subtitle="Manage your active and past tenancies" />
      <EmptyState icon={FiUsers} title="No active tenancies" description="When you confirm a rental, tenancies will appear here." />
    </div>
  );
}
