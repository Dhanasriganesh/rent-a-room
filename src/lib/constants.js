// Cities in Germany
export const CITIES = [
  "Berlin",
  "Munich",
  "Hamburg",
  "Frankfurt",
  "Cologne",
  "Düsseldorf",
  "Stuttgart",
  "Leipzig",
  "Dresden",
  "Heidelberg",
  "Nuremberg",
  "Bonn",
  "Mannheim",
  "Aachen",
  "Freiburg",
];

// Property Types
export const PROPERTY_TYPES = [
  { value: "apartment_building", label: "Apartment Building" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "commercial", label: "Commercial Building" },
  { value: "mixed", label: "Mixed Use" },
];

// Unit/Listing Types
export const UNIT_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "studio", label: "Studio" },
  { value: "room", label: "Room" },
  { value: "house", label: "Entire House" },
  { value: "loft", label: "Loft" },
  { value: "penthouse", label: "Penthouse" },
];

// Listing Statuses
export const LISTING_STATUSES = [
  { value: "draft", label: "Draft", color: "default" },
  { value: "pending_review", label: "Pending Review", color: "warning" },
  { value: "published", label: "Published", color: "success" },
  { value: "paused", label: "Paused", color: "warning" },
  { value: "reserved", label: "Reserved", color: "info" },
  { value: "rented", label: "Rented", color: "primary" },
  { value: "archived", label: "Archived", color: "default" },
];

// Application Statuses
export const APPLICATION_STATUSES = [
  { value: "new", label: "New", color: "info" },
  { value: "under_review", label: "Under review", color: "warning" },
  { value: "in_review", label: "In review", color: "warning" },
  { value: "more_information_requested", label: "More info requested", color: "warning" },
  { value: "more_info_needed", label: "More info needed", color: "warning" },
  { value: "viewing_scheduled", label: "Viewing scheduled", color: "warning" },
  { value: "viewing_requested", label: "Viewing requested", color: "warning" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "accepted", label: "Accepted", color: "success" },
  { value: "allocated", label: "Allocated", color: "primary" },
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "withdrawn", label: "Withdrawn", color: "default" },
  { value: "closed", label: "Closed", color: "default" },
];

export const ALLOCATION_STATUSES = [
  { value: "pending", label: "Pending", color: "default" },
  { value: "reserved", label: "Reserved", color: "warning" },
  { value: "active", label: "Active", color: "success" },
  { value: "ended", label: "Ended", color: "default" },
  { value: "cancelled", label: "Cancelled", color: "danger" },
];

export const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft", color: "default" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "issued", label: "Issued", color: "info" },
  { value: "signed", label: "Signed", color: "primary" },
  { value: "superseded", label: "Superseded", color: "warning" },
  { value: "void", label: "Void", color: "danger" },
];

export const RENEWAL_REQUEST_STATUSES = [
  { value: "submitted", label: "Submitted", color: "info" },
  { value: "under_review", label: "Under review", color: "warning" },
  { value: "approved", label: "Approved", color: "success" },
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "fulfilled", label: "Fulfilled", color: "primary" },
  { value: "cancelled", label: "Cancelled", color: "default" },
];

/** Named placeholders for contract templates (Phase 4) */
export const CONTRACT_PLACEHOLDERS = [
  { key: "owner_legal_name", label: "Owner legal name", required: true },
  { key: "tenant_full_name", label: "Tenant full name", required: true },
  { key: "property_address", label: "Property address", required: true },
  { key: "room_label", label: "Room label", required: true },
  { key: "bed_label", label: "Bed label", required: true },
  { key: "contract_start_date", label: "Start date", required: true },
  { key: "contract_end_date", label: "End date", required: false },
  { key: "monthly_rent", label: "Monthly rent", required: true },
  { key: "security_deposit", label: "Security deposit", required: true },
  { key: "contract_reference", label: "Contract reference", required: true },
  { key: "currency", label: "Currency", required: false },
];

export const MAINTENANCE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "heating", label: "Heating / HVAC" },
  { value: "appliance", label: "Appliance" },
  { value: "furniture", label: "Furniture" },
  { value: "cleaning", label: "Cleaning" },
  { value: "keys", label: "Keys / access" },
  { value: "other", label: "Other" },
];

export const MAINTENANCE_URGENCY = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent — needs human escalation" },
];

export const MAINTENANCE_STATUSES = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const MOVE_IN_CHECKLIST_ITEMS = [
  { key: "contract_checked", label: "Contract status checked" },
  { key: "signatures_recorded", label: "Required signatures/approvals recorded" },
  { key: "allocation_confirmed", label: "Start date and allocation confirmed" },
  { key: "deposit_recorded", label: "Payment/deposit status recorded (if applicable)" },
  { key: "keys_handover", label: "Key handover / check-in appointment recorded" },
  { key: "condition_checklist", label: "Condition/inventory checklist completed" },
  { key: "instructions_sent", label: "Tenant received approved instructions" },
];

export const MOVE_OUT_CHECKLIST_ITEMS = [
  { key: "notice_recorded", label: "Intended move-out date recorded" },
  { key: "notice_confirmed", label: "Manager confirmed notice (legal review if needed)" },
  { key: "inspection_scheduled", label: "Inspection scheduled" },
  { key: "condition_recorded", label: "Room condition recorded" },
  { key: "keys_returned", label: "Keys returned" },
  { key: "rent_reviewed", label: "Outstanding rent / adjustments flagged for staff" },
  { key: "allocation_end_approved", label: "Allocation end approved by staff" },
  { key: "bed_cleaning_hold", label: "Bed held for cleaning/maintenance if needed" },
  { key: "availability_reopened", label: "Availability reopened only after manager confirmation" },
];

export const DEFAULT_CONTRACT_TEMPLATE_BODY = `RENTAL AGREEMENT (DRAFT)

Contract reference: {{contract_reference}}

This agreement is between:
Owner: {{owner_legal_name}}
Tenant: {{tenant_full_name}}

Property: {{property_address}}
Room: {{room_label}}
Bed / space: {{bed_label}}

Start date: {{contract_start_date}}
End date: {{contract_end_date}}

Monthly rent: {{currency}} {{monthly_rent}}
Security deposit: {{currency}} {{security_deposit}}

This document is a system-generated DRAFT for internal review.
It is not signed and is not a legally binding instrument until
approved and executed through the required process.

Generated for mediation workflow — do not present as a signed contract.`;

// Tenancy Statuses
export const TENANCY_STATUSES = [
  { value: "draft", label: "Draft", color: "default" },
  { value: "awaiting_documents", label: "Awaiting Documents", color: "warning" },
  { value: "awaiting_payment", label: "Awaiting Payment", color: "warning" },
  { value: "upcoming", label: "Upcoming", color: "info" },
  { value: "active", label: "Active", color: "success" },
  { value: "ended", label: "Ended", color: "default" },
  { value: "cancelled", label: "Cancelled", color: "danger" },
];

// Payment Statuses
export const PAYMENT_STATUSES = [
  { value: "upcoming", label: "Upcoming", color: "default" },
  { value: "due", label: "Due", color: "warning" },
  { value: "paid", label: "Paid", color: "success" },
  { value: "partial", label: "Partial", color: "warning" },
  { value: "overdue", label: "Overdue", color: "danger" },
  { value: "failed", label: "Failed", color: "danger" },
  { value: "disputed", label: "Disputed", color: "danger" },
  { value: "waived", label: "Waived", color: "default" },
];

// Request/Maintenance Statuses
export const REQUEST_STATUSES = [
  { value: "new", label: "New", color: "info" },
  { value: "acknowledged", label: "Acknowledged", color: "info" },
  { value: "in_progress", label: "In Progress", color: "warning" },
  { value: "waiting_for_tenant", label: "Waiting for Tenant", color: "warning" },
  { value: "resolved", label: "Resolved", color: "success" },
  { value: "closed", label: "Closed", color: "default" },
];

// Request Categories
export const REQUEST_CATEGORIES = [
  { value: "repair", label: "Repair" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "heating", label: "Heating" },
  { value: "appliance", label: "Appliance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "pest_control", label: "Pest Control" },
  { value: "noise", label: "Noise Complaint" },
  { value: "access", label: "Access/Keys" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
];

// Request Priorities
export const REQUEST_PRIORITIES = [
  { value: "low", label: "Low", color: "default" },
  { value: "medium", label: "Medium", color: "warning" },
  { value: "high", label: "High", color: "danger" },
  { value: "urgent", label: "Urgent", color: "danger" },
];

// Document Types
export const DOCUMENT_TYPES = [
  { value: "id_proof", label: "ID/Passport" },
  { value: "income_proof", label: "Proof of Income" },
  { value: "employment_letter", label: "Employment Letter" },
  { value: "schufa", label: "SCHUFA Report" },
  { value: "previous_landlord", label: "Previous Landlord Reference" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "student_enrollment", label: "Student Enrollment" },
  { value: "rental_agreement", label: "Rental Agreement" },
  { value: "other", label: "Other" },
];

// Document Statuses
export const DOCUMENT_STATUSES = [
  { value: "requested", label: "Requested", color: "info" },
  { value: "uploaded", label: "Uploaded", color: "warning" },
  { value: "under_review", label: "Under Review", color: "warning" },
  { value: "accepted", label: "Accepted", color: "success" },
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "expired", label: "Expired", color: "danger" },
  { value: "re_upload_required", label: "Re-upload Required", color: "danger" },
];

// Amenities
export const AMENITIES = [
  { value: "wifi", label: "Wi-Fi", icon: "wifi" },
  { value: "parking", label: "Parking", icon: "car" },
  { value: "elevator", label: "Elevator", icon: "arrow-up" },
  { value: "balcony", label: "Balcony", icon: "sun" },
  { value: "terrace", label: "Terrace", icon: "sun" },
  { value: "garden", label: "Garden", icon: "tree" },
  { value: "gym", label: "Gym", icon: "activity" },
  { value: "pool", label: "Pool", icon: "droplet" },
  { value: "sauna", label: "Sauna", icon: "thermometer" },
  { value: "storage", label: "Storage/Cellar", icon: "box" },
  { value: "bike_storage", label: "Bike Storage", icon: "bike" },
  { value: "laundry", label: "Laundry Room", icon: "loader" },
  { value: "dishwasher", label: "Dishwasher", icon: "disc" },
  { value: "washing_machine", label: "Washing Machine", icon: "loader" },
  { value: "dryer", label: "Dryer", icon: "wind" },
  { value: "ac", label: "Air Conditioning", icon: "wind" },
  { value: "heating", label: "Central Heating", icon: "thermometer" },
  { value: "floor_heating", label: "Floor Heating", icon: "thermometer" },
  { value: "fireplace", label: "Fireplace", icon: "flame" },
  { value: "furnished", label: "Furnished", icon: "home" },
  { value: "pets_allowed", label: "Pets Allowed", icon: "heart" },
  { value: "smoking_allowed", label: "Smoking Allowed", icon: "cloud" },
  { value: "wheelchair", label: "Wheelchair Accessible", icon: "user" },
  { value: "security", label: "24/7 Security", icon: "shield" },
  { value: "concierge", label: "Concierge", icon: "user" },
];

// Subscription Plans
export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    interval: "month",
    features: {
      maxProperties: 1,
      maxUnits: 3,
      maxListings: 3,
      customDomain: false,
      analytics: "basic",
      support: "email",
    },
  },
  {
    id: "professional",
    name: "Professional",
    price: 29,
    interval: "month",
    features: {
      maxProperties: 5,
      maxUnits: 20,
      maxListings: 20,
      customDomain: true,
      analytics: "advanced",
      support: "priority",
    },
  },
  {
    id: "business",
    name: "Business",
    price: 79,
    interval: "month",
    features: {
      maxProperties: -1, // unlimited
      maxUnits: -1,
      maxListings: -1,
      customDomain: true,
      analytics: "full",
      support: "dedicated",
    },
  },
];

// Utility functions
export function getStatusConfig(statuses, value) {
  return statuses.find((s) => s.value === value) || { value, label: value, color: "default" };
}

export function formatCurrency(amount, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date, options = {}) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

export function formatRelativeDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
