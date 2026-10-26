/**
 * Canonical status values from the product specification (Section 10).
 * Keep UI labels in constants.js; use these values for writes and comparisons.
 */

export const LISTING_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  PUBLISHED: "published",
  PAUSED: "paused",
  RESERVED: "reserved",
  RENTED: "rented",
  ARCHIVED: "archived",
  REJECTED: "rejected",
};

export const APPLICATION_STATUS = {
  NEW: "new",
  UNDER_REVIEW: "under_review",
  IN_REVIEW: "in_review", // legacy alias
  MORE_INFORMATION_REQUESTED: "more_information_requested",
  MORE_INFO_NEEDED: "more_info_needed", // legacy alias
  VIEWING_SCHEDULED: "viewing_scheduled",
  VIEWING_REQUESTED: "viewing_requested", // legacy alias
  APPROVED: "approved",
  ACCEPTED: "accepted", // legacy alias of approved
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
  ALLOCATED: "allocated",
  CLOSED: "closed",
  EXPIRED: "expired",
};

export const ALLOCATION_STATUS = {
  PENDING: "pending",
  RESERVED: "reserved",
  ACTIVE: "active",
  ENDED: "ended",
  CANCELLED: "cancelled",
};

export const CONTRACT_STATUS = {
  DRAFT: "draft",
  APPROVED: "approved",
  ISSUED: "issued",
  SIGNED: "signed",
  SUPERSEDED: "superseded",
  VOID: "void",
};

export const RENEWAL_REQUEST_STATUS = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
};

/** Statuses that block a new allocation on the same application */
export const APPLICATION_TERMINAL = ["allocated", "rejected", "withdrawn", "closed", "expired"];

/** Application must be approved before bed allocation */
export const APPLICATION_ALLOCATABLE = ["approved", "accepted"];

export const TENANCY_STATUS = {
  DRAFT: "draft",
  AWAITING_DOCUMENTS: "awaiting_documents",
  AWAITING_AGREEMENT: "awaiting_agreement",
  AWAITING_PAYMENT: "awaiting_payment",
  UPCOMING: "upcoming",
  ACTIVE: "active",
  ENDED: "ended",
  CANCELLED: "cancelled",
};

export const UNIT_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
};

export const RENT_CHARGE_STATUS = {
  UPCOMING: "upcoming",
  DUE: "due",
  PARTIAL: "partial",
  PAID: "paid",
  OVERDUE: "overdue",
  FAILED: "failed",
  DISPUTED: "disputed",
  WAIVED: "waived",
  CANCELLED: "cancelled",
};

export const PAYMENT_ATTEMPT_STATUS = {
  INITIATED: "initiated",
  PENDING: "pending",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  REVERSED: "reversed",
};

export const DOCUMENT_STATUS = {
  REQUESTED: "requested",
  UPLOADED: "uploaded",
  UNDER_REVIEW: "under_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "expired",
  RE_UPLOAD_REQUIRED: "re_upload_required",
};

export const REQUEST_STATUS = {
  NEW: "new",
  TRIAGED: "triaged",
  ACKNOWLEDGED: "acknowledged",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  WAITING_FOR_TENANT: "waiting_for_tenant",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

export const MOVE_EVENT_TYPE = {
  MOVE_IN: "move_in",
  MOVE_OUT: "move_out",
};

export const MOVE_EVENT_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  PENDING_REVIEW: "pending_review",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const ACCOUNT_STATUS = {
  INVITED: "invited",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  GRACE: "grace",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export const DOMAIN_VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  ERROR: "error",
};

export const DEFAULT_NOTIFICATION_PREFS = {
  email: {
    applications: true,
    messages: true,
    documents: true,
    rentReminders: true,
    paymentConfirmations: true,
    overdueRent: true,
    maintenance: true,
  },
  inApp: {
    applications: true,
    messages: true,
    documents: true,
    rentReminders: true,
    paymentConfirmations: true,
    overdueRent: true,
    maintenance: true,
  },
};
