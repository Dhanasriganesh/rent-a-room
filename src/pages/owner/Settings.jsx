import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getPayoutAccount,
  upsertPayoutAccount,
  getOwnerSubscription,
  createAuditLog,
} from "../../lib/firestore";
import { SUBSCRIPTION_PLANS, formatCurrency } from "../../lib/constants";
import { DEFAULT_NOTIFICATION_PREFS } from "../../lib/statuses";
import {
  PageHeader,
  Card,
  Input,
  Textarea,
  Select,
  Button,
  Tabs,
  Alert,
  Spinner,
  Badge,
} from "../../components/ui";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "site", label: "Public Site" },
  { id: "payout", label: "Payout Settings" },
  { id: "notifications", label: "Notifications" },
  { id: "subscription", label: "Subscription" },
];

export default function OwnerSettings() {
  const {
    user,
    userProfile,
    ownerProfile,
    updateUserProfile,
    updateOwnerProfileData,
    resendVerificationEmail,
    isEmailVerified,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phone: "",
    city: "",
    companyName: "",
    businessType: "individual",
  });

  const [siteForm, setSiteForm] = useState({
    siteName: "",
    publicSlug: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    primaryColor: "#1a3c32",
    showEmail: true,
    showWhatsApp: true,
    showInAppChat: true,
    publicationStatus: "published",
  });

  const [payoutForm, setPayoutForm] = useState({
    accountHolderName: "",
    iban: "",
    bic: "",
    bankName: "",
    currency: "EUR",
  });
  const [payoutMeta, setPayoutMeta] = useState(null);

  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const [payout, sub] = await Promise.all([
          getPayoutAccount(user.uid),
          getOwnerSubscription(user.uid),
        ]);
        if (cancelled) return;

        setProfileForm({
          displayName: userProfile?.displayName || "",
          phone: userProfile?.phone || "",
          city: userProfile?.city || "",
          companyName: ownerProfile?.companyName || "",
          businessType: ownerProfile?.businessType || "individual",
        });

        const brand = ownerProfile?.brandSettings || {};
        setSiteForm({
          siteName: ownerProfile?.siteName || userProfile?.displayName || "",
          publicSlug: ownerProfile?.publicSlug || "",
          description: brand.description || "",
          contactEmail: brand.contactEmail || userProfile?.email || "",
          contactPhone: brand.contactPhone || userProfile?.phone || "",
          whatsapp: brand.whatsapp || userProfile?.phone || "",
          primaryColor: brand.primaryColor || "#1a3c32",
          showEmail: brand.showEmail !== false,
          showWhatsApp: brand.showWhatsApp !== false,
          showInAppChat: brand.showInAppChat !== false,
          publicationStatus: ownerProfile?.publicationStatus || "published",
        });

        if (payout) {
          setPayoutForm({
            accountHolderName: payout.accountHolderName || "",
            iban: payout.iban || "",
            bic: payout.bic || "",
            bankName: payout.bankName || "",
            currency: payout.currency || "EUR",
          });
          setPayoutMeta(payout);
        }

        setPrefs(userProfile?.notificationPreferences || DEFAULT_NOTIFICATION_PREFS);
        setSubscription(sub);
      } catch (err) {
        console.error(err);
        setError("Failed to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, userProfile, ownerProfile]);

  const flash = (type, text) => {
    setMessage({ type, text });
    setError(null);
    window.setTimeout(() => setMessage(null), 4000);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: profileForm.displayName.trim(),
        phone: profileForm.phone.trim(),
        city: profileForm.city.trim(),
      });
      await updateOwnerProfileData({
        companyName: profileForm.companyName.trim(),
        businessType: profileForm.businessType,
      });
      await createAuditLog(user.uid, "owner.profile.update", "owner_profile", user.uid);
      flash("success", "Profile saved");
    } catch (err) {
      setError(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveSite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const slug = siteForm.publicSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "");

      if (!slug) {
        setError("Public URL slug is required");
        setSaving(false);
        return;
      }

      await updateOwnerProfileData({
        siteName: siteForm.siteName.trim(),
        publicSlug: slug,
        publicationStatus: siteForm.publicationStatus,
        brandSettings: {
          ...(ownerProfile?.brandSettings || {}),
          description: siteForm.description.trim(),
          contactEmail: siteForm.contactEmail.trim(),
          contactPhone: siteForm.contactPhone.trim(),
          whatsapp: siteForm.whatsapp.trim(),
          primaryColor: siteForm.primaryColor,
          showEmail: siteForm.showEmail,
          showWhatsApp: siteForm.showWhatsApp,
          showInAppChat: siteForm.showInAppChat,
        },
      });
      await createAuditLog(user.uid, "owner.site.update", "owner_site", user.uid);
      flash("success", "Public site settings saved");
    } catch (err) {
      setError(err.message || "Could not save site settings");
    } finally {
      setSaving(false);
    }
  };

  const savePayout = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await upsertPayoutAccount(user.uid, {
        ...payoutForm,
        accountHolderName: payoutForm.accountHolderName.trim(),
        iban: payoutForm.iban.replace(/\s+/g, "").toUpperCase(),
        bic: payoutForm.bic.trim().toUpperCase(),
        bankName: payoutForm.bankName.trim(),
        verificationStatus: "pending",
      });
      await updateOwnerProfileData({ payoutAccountId: id });
      await createAuditLog(user.uid, "owner.payout.update", "payout_account", id);
      const refreshed = await getPayoutAccount(user.uid);
      setPayoutMeta(refreshed);
      flash("success", "Payout details saved (pending verification)");
    } catch (err) {
      setError(err.message || "Could not save payout settings");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({ notificationPreferences: prefs });
      flash("success", "Notification preferences saved");
    } catch (err) {
      setError(err.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (channel, key) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: !prev[channel][key],
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const plan =
    SUBSCRIPTION_PLANS.find(
      (p) => p.id === (ownerProfile?.subscriptionPlanId || subscription?.planId || "starter")
    ) || SUBSCRIPTION_PLANS[0];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, brand, payouts, and plan" />

      {!isEmailVerified && (
        <Alert variant="warning" className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Please verify your email to keep your account secure.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await resendVerificationEmail();
                flash("success", "Verification email sent");
              }}
            >
              Resend verification
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert variant={message.type === "success" ? "success" : "info"} className="mb-6">
          {message.text}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      <Card>
        {activeTab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              <Badge variant={ownerProfile?.verificationStatus === "verified" ? "success" : "warning"}>
                Owner verification: {ownerProfile?.verificationStatus || "pending"}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={profileForm.displayName}
                onChange={(e) => setProfileForm((p) => ({ ...p, displayName: e.target.value }))}
                required
              />
              <Input label="Email" type="email" value={userProfile?.email || ""} disabled />
              <Input
                label="Phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                label="City"
                value={profileForm.city}
                onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))}
              />
              <Input
                label="Company Name"
                value={profileForm.companyName}
                onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))}
                hint="Optional"
              />
              <Select
                label="Account Type"
                value={profileForm.businessType}
                onChange={(e) => setProfileForm((p) => ({ ...p, businessType: e.target.value }))}
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "business", label: "Business" },
                ]}
              />
            </div>
            <div className="pt-2">
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {activeTab === "site" && (
          <form onSubmit={saveSite} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Owner Public Website</h2>
            <p className="text-sm text-gray-500">
              Prospective tenants see only your published listings on your branded site.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Site / Brand Name"
                value={siteForm.siteName}
                onChange={(e) => setSiteForm((p) => ({ ...p, siteName: e.target.value }))}
                required
              />
              <Input
                label="Public URL Slug"
                value={siteForm.publicSlug}
                onChange={(e) => setSiteForm((p) => ({ ...p, publicSlug: e.target.value }))}
                hint={`Your site: /owner/${siteForm.publicSlug || "your-slug"}`}
                required
              />
              <Input
                label="Public Contact Email"
                type="email"
                value={siteForm.contactEmail}
                onChange={(e) => setSiteForm((p) => ({ ...p, contactEmail: e.target.value }))}
              />
              <Input
                label="Public Phone"
                value={siteForm.contactPhone}
                onChange={(e) => setSiteForm((p) => ({ ...p, contactPhone: e.target.value }))}
              />
              <Input
                label="WhatsApp Number"
                value={siteForm.whatsapp}
                onChange={(e) => setSiteForm((p) => ({ ...p, whatsapp: e.target.value }))}
              />
              <Input
                label="Brand Color"
                type="color"
                value={siteForm.primaryColor}
                onChange={(e) => setSiteForm((p) => ({ ...p, primaryColor: e.target.value }))}
              />
              <Select
                label="Publication Status"
                value={siteForm.publicationStatus}
                onChange={(e) => setSiteForm((p) => ({ ...p, publicationStatus: e.target.value }))}
                options={[
                  { value: "published", label: "Published" },
                  { value: "unpublished", label: "Unpublished" },
                  { value: "read_only", label: "Read Only" },
                ]}
              />
            </div>
            <Textarea
              label="About / Rental Policies"
              rows={4}
              value={siteForm.description}
              onChange={(e) => setSiteForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["showEmail", "Show email contact"],
                ["showWhatsApp", "Show WhatsApp"],
                ["showInAppChat", "Allow in-app chat"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={siteForm[key]}
                    onChange={(e) => setSiteForm((p) => ({ ...p, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="pt-2">
              <Button type="submit" loading={saving}>
                Save Site Settings
              </Button>
            </div>
          </form>
        )}

        {activeTab === "payout" && (
          <form onSubmit={savePayout} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Rent Payout / Bank Details</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Tenant rent is paid to you — separate from your platform subscription.
                </p>
              </div>
              {payoutMeta && (
                <Badge variant={payoutMeta.verificationStatus === "verified" ? "success" : "warning"}>
                  {payoutMeta.verificationStatus || "pending"}
                </Badge>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Account Holder Name"
                value={payoutForm.accountHolderName}
                onChange={(e) => setPayoutForm((p) => ({ ...p, accountHolderName: e.target.value }))}
                required
              />
              <Input
                label="Bank Name"
                value={payoutForm.bankName}
                onChange={(e) => setPayoutForm((p) => ({ ...p, bankName: e.target.value }))}
              />
              <Input
                label="IBAN"
                value={payoutForm.iban}
                onChange={(e) => setPayoutForm((p) => ({ ...p, iban: e.target.value }))}
                required
                hint="Never store online banking passwords — IBAN only"
              />
              <Input
                label="BIC / SWIFT"
                value={payoutForm.bic}
                onChange={(e) => setPayoutForm((p) => ({ ...p, bic: e.target.value }))}
              />
            </div>
            <Alert variant="info">
              MVP payments use verified bank-transfer instructions with a unique payment reference.
              Details stay pending until verified.
            </Alert>
            <div className="pt-2">
              <Button type="submit" loading={saving}>
                Save Payout Details
              </Button>
            </div>
          </form>
        )}

        {activeTab === "notifications" && (
          <form onSubmit={saveNotifications} className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            {["email", "inApp"].map((channel) => (
              <div key={channel}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {channel === "email" ? "Email" : "In-app"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.keys(prefs[channel] || {}).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(prefs[channel][key])}
                        onChange={() => togglePref(channel, key)}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button type="submit" loading={saving}>
              Save Preferences
            </Button>
          </form>
        )}

        {activeTab === "subscription" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Platform Subscription</h2>
            <p className="text-sm text-gray-500">
              Your SaaS plan is billed to you by the platform operator. It is not tenant rent.
            </p>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(plan.price)} / {plan.interval}
                  </p>
                </div>
                <Badge variant="info">
                  Status: {ownerProfile?.subscriptionStatus || subscription?.status || "trial"}
                </Badge>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                <li>
                  Properties:{" "}
                  {plan.features.maxProperties === -1 ? "Unlimited" : plan.features.maxProperties}
                </li>
                <li>
                  Units: {plan.features.maxUnits === -1 ? "Unlimited" : plan.features.maxUnits}
                </li>
                <li>Custom domain: {plan.features.customDomain ? "Yes" : "No (subdomain only)"}</li>
                <li>Analytics: {plan.features.analytics}</li>
              </ul>
            </div>
            <Alert variant="info">
              Plan upgrades, invoices, and admin-managed subscriptions will be available in the
              admin console. Contact support to change plans during MVP.
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
}
