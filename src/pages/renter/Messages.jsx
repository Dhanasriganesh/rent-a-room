import { PageHeader, EmptyState } from "../../components/ui";
import { FiMessageSquare } from "react-icons/fi";

export default function RenterMessages() {
  return (
    <div>
      <PageHeader title="Messages" subtitle="Your conversations with property owners" />
      <EmptyState icon={FiMessageSquare} title="No messages yet" description="When you contact property owners, your conversations will appear here." />
    </div>
  );
}
