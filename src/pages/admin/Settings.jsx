import { PageHeader, Card, Alert } from "../../components/ui";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform configuration" subtitle="Operational defaults for the SaaS" />
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Launch defaults</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Market: Germany (EUR)</li>
          <li>Owner URL: /owner/:publicSlug (custom domains later)</li>
          <li>Rent MVP: bank transfer + manual reconciliation</li>
          <li>Subscription billing separate from tenant rent</li>
          <li>Document access: tenant + owning landlord + audited admin only</li>
        </ul>
        <Alert variant="info">
          Wire Stripe/Paddle webhooks and custom-domain TLS verification in a later release.
          Keep this console for plan assignment and account status in MVP.
        </Alert>
      </Card>
    </div>
  );
}
