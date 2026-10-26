import { PageHeader, Card, Alert } from "../../components/ui";

export default function ManagerPlaceholder({ title, phase, description }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={`Scheduled for ${phase}`} />
      <Card>
        <Alert variant="info">{description}</Alert>
        <p className="mt-4 text-sm text-gray-600">
          This route is reserved in the manager navigation so the desk structure matches the
          product specification. Implementation arrives in the named phase without disrupting
          current owner/renter flows.
        </p>
      </Card>
    </div>
  );
}
