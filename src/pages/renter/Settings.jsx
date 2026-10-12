import { useState } from "react";
import { PageHeader, Card, Input, Button, Tabs } from "../../components/ui";

export default function RenterSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <Tabs
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "preferences", label: "Search Preferences" },
          { id: "notifications", label: "Notifications" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />
      <Card>
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full Name" placeholder="Your name" />
              <Input label="Email" type="email" placeholder="your@email.com" />
              <Input label="Phone" placeholder="+49..." />
              <Input label="Current City" placeholder="Berlin" />
            </div>
            <div className="pt-4"><Button>Save Changes</Button></div>
          </div>
        )}
        {activeTab === "preferences" && <p className="text-gray-500">Search preferences coming soon...</p>}
        {activeTab === "notifications" && <p className="text-gray-500">Notification preferences coming soon...</p>}
      </Card>
    </div>
  );
}
