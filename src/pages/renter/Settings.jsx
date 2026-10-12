import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { CITIES, UNIT_TYPES } from "../../lib/constants";
import { DEFAULT_NOTIFICATION_PREFS } from "../../lib/statuses";
import {
  PageHeader,
  Card,
  Input,
  Select,
  Button,
  Tabs,
  Alert,
  Spinner,
  Badge,
} from "../../components/ui";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Search Preferences" },
  { id: "notifications", label: "Notifications" },
];

export default function RenterSettings() {
  const {
    userProfile,
    renterProfile,
    updateUserProfile,
    updateRenterProfileData,
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
  });

  const [prefsForm, setPrefsForm] = useState({
    cities: [],
    budgetMin: "",
    budgetMax: "",
    moveInDate: "",
    propertyTypes: [],
    furnished: "",
  });

  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    setProfileForm({
      displayName: userProfile?.displayName || "",
      phone: userProfile?.phone || renterProfile?.phone || "",
      city: userProfile?.city || "",
    });

    const p = renterProfile?.preferences || {};
    setPrefsForm({
      cities: p.cities || [],
      budgetMin: p.budgetMin || "",
      budgetMax: p.budgetMax || "",
      moveInDate: p.moveInDate || "",
      propertyTypes: p.propertyTypes || [],
      furnished: p.furnished === true ? "yes" : p.furnished === false ? "no" : "",
    });

    setPrefs(userProfile?.notificationPreferences || DEFAULT_NOTIFICATION_PREFS);
    setLoading(false);
  }, [userProfile, renterProfile]);

  const flash = (text) => {
    setMessage(text);
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
      await updateRenterProfileData({ phone: profileForm.phone.trim() });
      flash("Profile saved");
    } catch (err) {
      setError(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const saveSearchPrefs = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateRenterProfileData({
        preferences: {
          cities: prefsForm.cities,
          budgetMin: Number(prefsForm.budgetMin) || 0,
          budgetMax: Number(prefsForm.budgetMax) || 0,
          moveInDate: prefsForm.moveInDate || null,
          propertyTypes: prefsForm.propertyTypes,
          furnished:
            prefsForm.furnished === "yes"
              ? true
              : prefsForm.furnished === "no"
                ? false
                : null,
        },
      });
      flash("Search preferences saved");
    } catch (err) {
      setError(err.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({ notificationPreferences: prefs });
      flash("Notification preferences saved");
    } catch (err) {
      setError(err.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = (city) => {
    setPrefsForm((prev) => {
      const cities = prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city];
      return { ...prev, cities };
    });
  };

  const toggleType = (value) => {
    setPrefsForm((prev) => {
      const propertyTypes = prev.propertyTypes.includes(value)
        ? prev.propertyTypes.filter((t) => t !== value)
        : [...prev.propertyTypes, value];
      return { ...prev, propertyTypes };
    });
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

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      {!isEmailVerified && (
        <Alert variant="warning" className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Verify your email to secure your account.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await resendVerificationEmail();
                flash("Verification email sent");
              }}
            >
              Resend verification
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert variant="success" className="mb-6">
          {message}
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
              <Badge
                variant={
                  renterProfile?.verificationStatus === "verified" ? "success" : "warning"
                }
              >
                Identity: {renterProfile?.verificationStatus || "pending"}
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
                label="Current City"
                value={profileForm.city}
                onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div className="pt-2">
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {activeTab === "preferences" && (
          <form onSubmit={saveSearchPrefs} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Search Preferences</h2>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Preferred cities</p>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      prefsForm.cities.includes(city)
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Budget Min (€)"
                type="number"
                min="0"
                value={prefsForm.budgetMin}
                onChange={(e) => setPrefsForm((p) => ({ ...p, budgetMin: e.target.value }))}
              />
              <Input
                label="Budget Max (€)"
                type="number"
                min="0"
                value={prefsForm.budgetMax}
                onChange={(e) => setPrefsForm((p) => ({ ...p, budgetMax: e.target.value }))}
              />
              <Input
                label="Move-in Date"
                type="date"
                value={prefsForm.moveInDate || ""}
                onChange={(e) => setPrefsForm((p) => ({ ...p, moveInDate: e.target.value }))}
              />
            </div>
            <Select
              label="Furnished"
              value={prefsForm.furnished}
              onChange={(e) => setPrefsForm((p) => ({ ...p, furnished: e.target.value }))}
              options={[
                { value: "yes", label: "Furnished" },
                { value: "no", label: "Unfurnished" },
              ]}
              placeholder="No preference"
            />
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Unit types</p>
              <div className="flex flex-wrap gap-2">
                {UNIT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleType(type.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      prefsForm.propertyTypes.includes(type.value)
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" loading={saving}>
              Save Preferences
            </Button>
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
      </Card>
    </div>
  );
}
