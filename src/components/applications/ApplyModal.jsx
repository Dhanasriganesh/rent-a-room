import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createApplication, createPublicEnquiry } from "../../lib/firestore";
import { assertClientRateLimit, RATE_LIMITS } from "../../lib/rateLimit";
import { Modal, Input, Textarea, Button, Alert, Checkbox } from "../ui";

export default function ApplyModal({ isOpen, onClose, listing }) {
  const { user, isRenter, userProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    desiredMoveIn: "",
    message: "",
    occupation: "",
    monthlyIncome: "",
    numberOfOccupants: "1",
    hasPets: false,
    petDetails: "",
  });

  if (!listing) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRenter && user && !form.desiredMoveIn) {
      setError("Please choose a desired move-in date.");
      return;
    }

    setSaving(true);
    try {
      assertClientRateLimit("apply", {
        ...RATE_LIMITS.apply,
        identity: user?.uid || form.applicantEmail || "anon",
      });
      if (isRenter && user) {
        await createApplication(user.uid, listing.id, {
          desiredMoveIn: form.desiredMoveIn,
          message: form.message.trim(),
          occupation: form.occupation.trim(),
          monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : null,
          numberOfOccupants: Number(form.numberOfOccupants) || 1,
          hasPets: form.hasPets,
          petDetails: form.petDetails.trim(),
          applicantName: userProfile?.displayName || "",
          applicantEmail: user.email || userProfile?.email || "",
        });
        onClose?.();
        navigate("/my-home/applications");
        return;
      }

      await createPublicEnquiry({
        listingId: listing.id,
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        applicantPhone: form.applicantPhone,
        desiredMoveIn: form.desiredMoveIn,
        message: form.message,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not submit application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apply: ${listing.title}`} size="lg">
      {done ? (
        <Alert variant="success">
          Enquiry sent. The desk will reply by email. A login is created for you only
          after you are accepted.
        </Alert>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {!(isRenter && user) && (
          <Alert variant="info">
            No account needed. The desk emails a login after you are accepted.
          </Alert>
        )}

        {!(isRenter && user) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              required
              value={form.applicantName}
              onChange={(e) => setForm((p) => ({ ...p, applicantName: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.applicantEmail}
              onChange={(e) => setForm((p) => ({ ...p, applicantEmail: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.applicantPhone}
              onChange={(e) => setForm((p) => ({ ...p, applicantPhone: e.target.value }))}
            />
          </div>
        )}

        <Input
          label="Desired move-in"
          type="date"
          required={Boolean(isRenter && user)}
          value={form.desiredMoveIn}
          onChange={(e) => setForm((p) => ({ ...p, desiredMoveIn: e.target.value }))}
        />

        {isRenter && user && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Number of occupants"
                type="number"
                min="1"
                value={form.numberOfOccupants}
                onChange={(e) => setForm((p) => ({ ...p, numberOfOccupants: e.target.value }))}
              />
              <Input
                label="Occupation"
                value={form.occupation}
                onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))}
              />
              <Input
                label="Monthly income (€)"
                type="number"
                min="0"
                value={form.monthlyIncome}
                onChange={(e) => setForm((p) => ({ ...p, monthlyIncome: e.target.value }))}
              />
            </div>
            <Checkbox
              label="I have pets"
              checked={form.hasPets}
              onChange={(e) => setForm((p) => ({ ...p, hasPets: e.target.checked }))}
            />
            {form.hasPets && (
              <Input
                label="Pet details"
                value={form.petDetails}
                onChange={(e) => setForm((p) => ({ ...p, petDetails: e.target.value }))}
              />
            )}
          </>
        )}

        <Textarea
          label={isRenter && user ? "Message to owner" : "Message"}
          rows={4}
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          hint="Introduce yourself and ask about a viewing if needed."
        />

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isRenter && user ? "Submit application" : "Send enquiry"}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
