import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createApplication } from "../../lib/firestore";
import { Modal, Input, Textarea, Button, Alert, Checkbox } from "../ui";

export default function ApplyModal({ isOpen, onClose, listing }) {
  const { user, isRenter } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
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

    if (!user) {
      navigate(`/login?redirect=/listings/${listing.id}`);
      return;
    }
    if (!isRenter) {
      setError("Only renter accounts can submit applications.");
      return;
    }
    if (!form.desiredMoveIn) {
      setError("Please choose a desired move-in date.");
      return;
    }

    setSaving(true);
    try {
      await createApplication(user.uid, listing.id, {
        desiredMoveIn: form.desiredMoveIn,
        message: form.message.trim(),
        occupation: form.occupation.trim(),
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : null,
        numberOfOccupants: Number(form.numberOfOccupants) || 1,
        hasPets: form.hasPets,
        petDetails: form.petDetails.trim(),
      });
      onClose?.();
      navigate("/my-home/applications");
    } catch (err) {
      setError(err.message || "Could not submit application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Apply: ${listing.title}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Desired move-in"
            type="date"
            required
            value={form.desiredMoveIn}
            onChange={(e) => setForm((p) => ({ ...p, desiredMoveIn: e.target.value }))}
          />
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

        <Textarea
          label="Message to owner"
          rows={4}
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          hint="Introduce yourself and ask about a viewing if needed."
        />

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

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Submit application
          </Button>
        </div>
      </form>
    </Modal>
  );
}
