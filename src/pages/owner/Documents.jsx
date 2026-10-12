import { PageHeader, EmptyState } from "../../components/ui";
import { FiFileText } from "react-icons/fi";

export default function OwnerDocuments() {
  return (
    <div>
      <PageHeader title="Documents" subtitle="Manage tenant documents and verifications" />
      <EmptyState icon={FiFileText} title="No documents yet" description="Tenant documents will appear here for review." />
    </div>
  );
}
