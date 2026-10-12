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
  { value: "viewing_requested", label: "Viewing Requested", color: "warning" },
  { value: "in_review", label: "In Review", color: "warning" },
  { value: "more_info_needed", label: "More Info Needed", color: "warning" },
  { value: "accepted", label: "Accepted", color: "success" },
  { value: "rejected", label: "Rejected", color: "danger" },
  { value: "withdrawn", label: "Withdrawn", color: "default" },
];

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
