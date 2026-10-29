import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, getSecondaryAuth } from "./firebase";
import {
  CONTRACT_PLACEHOLDERS,
  DEFAULT_CONTRACT_TEMPLATE_BODY,
  MOVE_IN_CHECKLIST_ITEMS,
  MOVE_OUT_CHECKLIST_ITEMS,
} from "./constants";
import { createSandboxWhatsAppProvider } from "./whatsapp/sandboxProvider";
import { WHATSAPP_MODES, normalizeE164 } from "./whatsapp/adapter";
import { COLLECTIONS } from "./collections";

export { COLLECTIONS };

export const INBOX_CHANNELS = ["website", "email", "in_app", "whatsapp", "other"];
export const INBOX_STATUSES = ["open", "pending", "escalated", "resolved"];
export const HANDOVER_STATES = ["none", "bot", "human"];

export const STAFF_ROLES = ["admin", "property_manager"];
export const PUBLIC_REGISTER_ROLES = ["owner", "renter"];

export const ROOM_TYPES = [
  { value: "private", label: "Private room" },
  { value: "shared", label: "Shared room" },
  { value: "studio", label: "Studio" },
  { value: "apartment", label: "Apartment / whole unit" },
  { value: "other", label: "Other" },
];

export const BED_STATUSES = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "occupied", label: "Occupied" },
  { value: "blocked", label: "Blocked" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive", label: "Inactive" },
];

// ============================================================================
// Generic CRUD Operations
// ============================================================================

export async function createDocument(collectionName, data) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function createDocumentWithId(collectionName, docId, data) {
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docId;
}

export async function getDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function updateDocument(collectionName, docId, data) {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(collectionName, docId) {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

function toSortableValue(value) {
  if (value == null) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

function sortResults(results, sortBy) {
  if (!sortBy) return results;
  const direction = sortBy.direction === "desc" ? -1 : 1;
  return [...results].sort((a, b) => {
    const av = toSortableValue(a[sortBy.field]);
    const bv = toSortableValue(b[sortBy.field]);
    if (av < bv) return -1 * direction;
    if (av > bv) return 1 * direction;
    return 0;
  });
}

export async function queryDocuments(collectionName, conditions = [], sortBy = null, limitCount = null) {
  const runQuery = async (includeOrderBy, fetchLimit) => {
    const queryConstraints = [];

    conditions.forEach(({ field, operator, value }) => {
      queryConstraints.push(where(field, operator, value));
    });

    if (includeOrderBy && sortBy) {
      queryConstraints.push(orderBy(sortBy.field, sortBy.direction || "asc"));
    }

    // Always apply a Firestore limit when provided — unbounded scans freeze the UI
    if (fetchLimit) {
      queryConstraints.push(limit(fetchLimit));
    }

    const q = query(collection(db, collectionName), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  try {
    return await runQuery(Boolean(sortBy), limitCount);
  } catch (err) {
    // Missing composite index: retry without orderBy, then sort/limit in memory
    const needsIndex =
      err?.code === "failed-precondition" ||
      String(err?.message || "").includes("requires an index");

    if (!needsIndex || !sortBy) throw err;

    console.warn(
      `[firestore] Missing index for ${collectionName}; sorting client-side. Deploy firestore.indexes.json when ready.`
    );

    // Cap fallback reads so a missing index never downloads an entire collection
    const fallbackLimit = limitCount
      ? Math.min(Math.max(limitCount * 5, limitCount), 500)
      : 500;
    let results = await runQuery(false, fallbackLimit);
    results = sortResults(results, sortBy);
    if (limitCount) results = results.slice(0, limitCount);
    return results;
  }
}

// ============================================================================
// Property Operations
// ============================================================================

export async function createProperty(ownerId, data) {
  const propertyData = {
    ownerId: ownerId || data.ownerId || null,
    ownerRecordId: data.ownerRecordId || null,
    name: data.name,
    address: data.address,
    city: data.city,
    postalCode: data.postalCode || "",
    country: data.country || "Germany",
    propertyType: data.propertyType,
    description: data.description || "",
    yearBuilt: data.yearBuilt || null,
    houseRules: data.houseRules || "",
    totalUnits: 0,
    occupiedUnits: 0,
    totalRooms: 0,
    totalBeds: 0,
    availableBeds: 0,
    status: data.status || "active", // draft | pending_review | active | inactive | archived
    images: data.images || [],
    createdBy: data.createdBy || null,
  };

  return createDocument(COLLECTIONS.PROPERTIES, propertyData);
}

export async function getPropertiesByOwner(ownerId) {
  return queryDocuments(
    COLLECTIONS.PROPERTIES,
    [{ field: "ownerId", operator: "==", value: ownerId }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function getAllProperties() {
  return queryDocuments(COLLECTIONS.PROPERTIES, [], { field: "createdAt", direction: "desc" }, 200);
}

export async function getPropertiesByOwnerRecord(ownerRecordId) {
  return queryDocuments(
    COLLECTIONS.PROPERTIES,
    [{ field: "ownerRecordId", operator: "==", value: ownerRecordId }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function getPropertyWithUnits(propertyId) {
  const property = await getDocument(COLLECTIONS.PROPERTIES, propertyId);
  if (!property) return null;
  
  const units = await getUnitsByProperty(propertyId);
  return { ...property, units };
}

export async function updatePropertyUnitCounts(propertyId) {
  const units = await getUnitsByProperty(propertyId);
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  
  await updateDocument(COLLECTIONS.PROPERTIES, propertyId, {
    totalUnits,
    occupiedUnits,
  });
}

// ============================================================================
// Unit Operations
// ============================================================================

export async function createUnit(propertyId, ownerId, data) {
  const unitData = {
    propertyId,
    ownerId,
    unitName: data.unitName,
    unitType: data.unitType,
    floor: data.floor || "",
    bedrooms: data.bedrooms || 1,
    bathrooms: data.bathrooms || 1,
    sqm: data.sqm || 0,
    rentAmount: data.rentAmount || 0,
    depositAmount: data.depositAmount || 0,
    currency: data.currency || "EUR",
    availableFrom: data.availableFrom || null,
    occupancyLimit: data.occupancyLimit || 1,
    furnished: data.furnished || false,
    amenities: data.amenities || [],
    description: data.description || "",
    status: "available", // available, reserved, occupied, maintenance
    currentTenancyId: null,
    images: data.images || [],
  };
  
  const unitId = await createDocument(COLLECTIONS.UNITS, unitData);
  
  // Update property unit count
  await updatePropertyUnitCounts(propertyId);
  
  return unitId;
}

export async function getUnitsByProperty(propertyId) {
  return queryDocuments(
    COLLECTIONS.UNITS,
    [{ field: "propertyId", operator: "==", value: propertyId }],
    { field: "unitName", direction: "asc" }
  );
}

export async function getUnitsByOwner(ownerId) {
  return queryDocuments(
    COLLECTIONS.UNITS,
    [{ field: "ownerId", operator: "==", value: ownerId }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function getAvailableUnitsByOwner(ownerId) {
  return queryDocuments(
    COLLECTIONS.UNITS,
    [
      { field: "ownerId", operator: "==", value: ownerId },
      { field: "status", operator: "==", value: "available" },
    ],
    { field: "unitName", direction: "asc" }
  );
}

// ============================================================================
// Listing Operations
// ============================================================================

export async function createListing(ownerId, data) {
  const listingData = {
    ownerId,
    unitId: data.unitId || null,
    propertyId: data.propertyId || null,
    title: data.title,
    description: data.description || "",
    propertyType: data.propertyType,
    address: data.address,
    city: data.city,
    area: data.area || "",
    postalCode: data.postalCode || "",
    country: data.country || "Germany",
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    rentAmount: data.rentAmount,
    depositAmount: data.depositAmount || data.rentAmount * 2,
    utilitiesIncluded: data.utilitiesIncluded || false,
    utilitiesAmount: data.utilitiesAmount || 0,
    currency: data.currency || "EUR",
    bedrooms: data.bedrooms || 1,
    bathrooms: data.bathrooms || 1,
    sqm: data.sqm || 0,
    floor: data.floor || "",
    totalFloors: data.totalFloors || "",
    furnished: data.furnished || false,
    anmeldung: data.anmeldung !== false,
    availableFrom: data.availableFrom || null,
    minimumStay: data.minimumStay || "",
    maximumOccupancy: data.maximumOccupancy || 1,
    amenities: data.amenities || [],
    rules: data.rules || "",
    images: data.images || [],
    status: "draft",
    publishedAt: null,
    viewCount: 0,
    applicationCount: 0,
  };
  
  return createDocument(COLLECTIONS.LISTINGS, listingData);
}

export async function getListingsByOwner(ownerId, status = null) {
  const conditions = [{ field: "ownerId", operator: "==", value: ownerId }];
  if (status) {
    conditions.push({ field: "status", operator: "==", value: status });
  }
  return queryDocuments(COLLECTIONS.LISTINGS, conditions, { field: "createdAt", direction: "desc" });
}

export async function getPublishedListings(filters = {}) {
  const conditions = [{ field: "status", operator: "==", value: "published" }];
  
  if (filters.ownerId) {
    conditions.push({ field: "ownerId", operator: "==", value: filters.ownerId });
  }
  
  if (filters.city) {
    conditions.push({ field: "city", operator: "==", value: filters.city });
  }
  
  if (filters.propertyType) {
    conditions.push({ field: "propertyType", operator: "==", value: filters.propertyType });
  }
  
  const limitCount = filters.limit ?? 100;
  return queryDocuments(
    COLLECTIONS.LISTINGS,
    conditions,
    { field: "publishedAt", direction: "desc" },
    limitCount
  );
}

/**
 * Public landing catalogue: active mediation properties plus published listings.
 * Rent "from" is the lowest active offer on that property, when one exists.
 */
export async function getPublicCatalog() {
  const [properties, listings, offers] = await Promise.all([
    queryDocuments(
      COLLECTIONS.PROPERTIES,
      [{ field: "status", operator: "==", value: "active" }],
      null,
      60
    ).catch((err) => {
      console.warn("Public properties unavailable:", err?.message || err);
      return [];
    }),
    getPublishedListings({ limit: 24 }).catch((err) => {
      console.warn("Public listings unavailable:", err?.message || err);
      return [];
    }),
    queryDocuments(
      COLLECTIONS.RENTAL_OFFERS,
      [{ field: "status", operator: "==", value: "active" }],
      null,
      200
    ).catch(() => []),
  ]);

  const rentByProperty = {};
  for (const offer of offers) {
    const amount = Number(offer.monthlyRent);
    if (!offer.propertyId || !Number.isFinite(amount) || amount <= 0) continue;
    const current = rentByProperty[offer.propertyId];
    if (current == null || amount < current) rentByProperty[offer.propertyId] = amount;
  }

  const ranked = [...properties].sort((a, b) => {
    const aAvail = Number(a.availableBeds) || 0;
    const bAvail = Number(b.availableBeds) || 0;
    if (aAvail > 0 && bAvail === 0) return -1;
    if (bAvail > 0 && aAvail === 0) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return {
    properties: ranked.map((property) => ({
      ...property,
      fromRent: rentByProperty[property.id] ?? null,
    })),
    listings,
  };
}

/**
 * Guest enquiry from the public site. No account is created.
 * Staff see it under Applicants and issue a login later.
 */
export async function createPublicEnquiry({
  listingId = null,
  propertyId = null,
  applicantName,
  applicantEmail,
  applicantPhone = "",
  desiredMoveIn = "",
  message = "",
}) {
  const hardening = await getHardeningSettings().catch(() => null);
  if (hardening?.maintenanceMode) {
    throw new Error("The site is temporarily unavailable. Please try again later.");
  }
  if (hardening && hardening.publicApplyEnabled === false) {
    throw new Error("Enquiries are temporarily closed.");
  }

  const name = String(applicantName || "").trim();
  const email = String(applicantEmail || "").trim().toLowerCase();
  const note = String(message || "").trim();
  if (name.length < 2) throw new Error("Please enter your name");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Please enter a valid email");
  }
  if (!listingId && !propertyId) throw new Error("Choose a property first");

  let listingTitle = "Property enquiry";
  let ownerId = null;
  let ownerRecordId = null;
  let resolvedPropertyId = propertyId || null;

  if (listingId) {
    const listing = await getDocument(COLLECTIONS.LISTINGS, listingId);
    if (!listing || listing.status !== "published") {
      throw new Error("This listing is not available");
    }
    listingTitle = listing.title || listingTitle;
    ownerId = listing.ownerId || null;
    resolvedPropertyId = listing.propertyId || resolvedPropertyId;
  }

  if (resolvedPropertyId) {
    try {
      const property = await getDocument(COLLECTIONS.PROPERTIES, resolvedPropertyId);
      if (!listingId && (!property || property.status !== "active")) {
        throw new Error("This property is not listed");
      }
      if (property) {
        if (!listingId) listingTitle = property.name || listingTitle;
        ownerId = ownerId || property.ownerId || null;
        ownerRecordId = property.ownerRecordId || null;
      }
    } catch (err) {
      if (!listingId) throw err;
    }
  }

  return createDocument(COLLECTIONS.APPLICATIONS, {
    renterId: null,
    listingId: listingId || null,
    ownerId,
    ownerRecordId,
    propertyId: resolvedPropertyId,
    roomId: null,
    bedId: null,
    requestedRoomType: "",
    listingTitle,
    applicantName: name,
    applicantEmail: email,
    applicantPhone: String(applicantPhone || "").trim(),
    desiredMoveIn: desiredMoveIn || null,
    intendedDuration: "",
    message: note,
    occupation: "",
    monthlyIncome: null,
    numberOfOccupants: 1,
    hasPets: false,
    petDetails: "",
    internalNotes: "",
    assignedManagerId: null,
    status: "new",
    submittedAt: serverTimestamp(),
    decidedAt: null,
    decisionNote: "",
    allocationId: null,
    source: "public",
    createdBy: null,
  });
}

export async function publishListing(listingId) {
  await updateDocument(COLLECTIONS.LISTINGS, listingId, {
    status: "published",
    publishedAt: serverTimestamp(),
  });
}

export async function incrementListingView(listingId) {
  const docRef = doc(db, COLLECTIONS.LISTINGS, listingId);
  await updateDoc(docRef, {
    viewCount: increment(1),
  });
}

// ============================================================================
// Application Operations
// ============================================================================

export async function createApplication(renterId, listingId, data) {
  const hardening = await getHardeningSettings().catch(() => null);
  if (hardening?.maintenanceMode) {
    throw new Error("The site is temporarily unavailable. Please try again later.");
  }
  if (hardening && hardening.publicApplyEnabled === false) {
    throw new Error("Applications are temporarily closed.");
  }

  const listing = await getDocument(COLLECTIONS.LISTINGS, listingId);
  if (!listing) throw new Error("Listing not found");

  // Prevent duplicate open applications for the same listing
  const existing = await queryDocuments(COLLECTIONS.APPLICATIONS, [
    { field: "renterId", operator: "==", value: renterId },
    { field: "listingId", operator: "==", value: listingId },
  ]);
  const open = existing.find(
    (a) => !["withdrawn", "rejected", "expired", "closed", "allocated"].includes(a.status)
  );
  if (open) {
    throw new Error("You already have an open application for this listing");
  }

  const applicationData = {
    renterId,
    listingId,
    ownerId: listing.ownerId || null,
    ownerRecordId: listing.ownerRecordId || null,
    propertyId: listing.propertyId || data.propertyId || null,
    roomId: data.roomId || listing.roomId || null,
    bedId: data.bedId || null,
    requestedRoomType: data.requestedRoomType || "",
    listingTitle: listing.title,
    applicantName: data.applicantName || "",
    applicantEmail: data.applicantEmail || "",
    applicantPhone: data.applicantPhone || "",
    desiredMoveIn: data.desiredMoveIn,
    intendedDuration: data.intendedDuration || "",
    message: data.message || "",
    occupation: data.occupation || "",
    monthlyIncome: data.monthlyIncome || null,
    numberOfOccupants: data.numberOfOccupants || 1,
    hasPets: data.hasPets || false,
    petDetails: data.petDetails || "",
    internalNotes: "",
    assignedManagerId: null,
    status: "new",
    submittedAt: serverTimestamp(),
    decidedAt: null,
    decisionNote: "",
    allocationId: null,
  };

  const appId = await createDocument(COLLECTIONS.APPLICATIONS, applicationData);

  const docRef = doc(db, COLLECTIONS.LISTINGS, listingId);
  await updateDoc(docRef, {
    applicationCount: increment(1),
  });

  if (listing.ownerId) {
    await createNotification(listing.ownerId, "application_new", {
      title: "New application",
      message: `New application for "${listing.title}"`,
      link: "/dashboard/applications",
      entityType: "application",
      entityId: appId,
    });

    await getOrCreateConversation({
      participantIds: [listing.ownerId, renterId],
      contextType: "application",
      contextId: appId,
      listingId,
      listingTitle: listing.title,
      initialMessage: data.message || `Hi, I applied for ${listing.title}.`,
      senderId: renterId,
    });
  }

  return appId;
}

export async function getApplicationsByOwner(ownerId, status = null) {
  const conditions = [{ field: "ownerId", operator: "==", value: ownerId }];
  if (status) {
    conditions.push({ field: "status", operator: "==", value: status });
  }
  return queryDocuments(COLLECTIONS.APPLICATIONS, conditions, { field: "submittedAt", direction: "desc" });
}

export async function getApplicationsByRenter(renterId) {
  return queryDocuments(
    COLLECTIONS.APPLICATIONS,
    [{ field: "renterId", operator: "==", value: renterId }],
    { field: "submittedAt", direction: "desc" }
  );
}

export async function updateApplicationStatus(applicationId, status, note = "", actorUserId = null) {
  const application = await getDocument(COLLECTIONS.APPLICATIONS, applicationId);
  if (!application) throw new Error("Application not found");

  if (application.status === "allocated" && status !== "allocated") {
    throw new Error("Allocated applications cannot change status here — end the allocation first");
  }

  await updateDocument(COLLECTIONS.APPLICATIONS, applicationId, {
    status,
    decisionNote: note || application.decisionNote || "",
    decidedAt: serverTimestamp(),
  });

  if (actorUserId) {
    await createAuditLog(actorUserId, "application.status", "application", applicationId, null, {
      from: application.status,
      to: status,
    });
  }

  if (application.renterId) {
    await createNotification(application.renterId, "application_status", {
      title: "Application update",
      message: `Your application is now: ${status.replace(/_/g, " ")}`,
      link: "/my-home/applications",
      entityType: "application",
      entityId: applicationId,
    });
  }

  return application;
}

export async function getAllApplications(status = null) {
  const conditions = status ? [{ field: "status", operator: "==", value: status }] : [];
  return queryDocuments(
    COLLECTIONS.APPLICATIONS,
    conditions,
    { field: "submittedAt", direction: "desc" },
    200
  );
}

export async function updateApplicationNotes(applicationId, internalNotes, actorUserId = null) {
  await updateDocument(COLLECTIONS.APPLICATIONS, applicationId, { internalNotes });
  if (actorUserId) {
    await createAuditLog(actorUserId, "application.notes", "application", applicationId);
  }
}

// ============================================================================
// Tenancy Operations
// ============================================================================

export async function createTenancy(ownerId, unitId, data) {
  const unit = await getDocument(COLLECTIONS.UNITS, unitId);
  if (!unit) throw new Error("Unit not found");
  
  const tenancyData = {
    ownerId,
    unitId,
    propertyId: unit.propertyId,
    applicationId: data.applicationId || null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    rentAmount: data.rentAmount || unit.rentAmount,
    depositAmount: data.depositAmount || unit.depositAmount,
    currency: data.currency || "EUR",
    paymentDueDay: data.paymentDueDay || 1,
    agreementReference: data.agreementReference || "",
    status: "draft",
    notes: data.notes || "",
  };
  
  return createDocument(COLLECTIONS.TENANCIES, tenancyData);
}

export async function addTenantToTenancy(tenancyId, tenantUserId, data = {}) {
  const memberData = {
    tenancyId,
    tenantUserId,
    rentShareAmount: data.rentShareAmount || null,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    isPrimaryTenant: data.isPrimaryTenant || false,
    status: "active",
  };
  
  return createDocument(COLLECTIONS.TENANCY_MEMBERS, memberData);
}

export async function getTenanciesByOwner(ownerId, status = null) {
  const conditions = [{ field: "ownerId", operator: "==", value: ownerId }];
  if (status) {
    conditions.push({ field: "status", operator: "==", value: status });
  }
  return queryDocuments(COLLECTIONS.TENANCIES, conditions, { field: "startDate", direction: "desc" });
}

export async function getActiveTenanciesByOwner(ownerId) {
  return queryDocuments(
    COLLECTIONS.TENANCIES,
    [
      { field: "ownerId", operator: "==", value: ownerId },
      { field: "status", operator: "==", value: "active" },
    ],
    { field: "startDate", direction: "desc" }
  );
}

export async function getTenancyWithMembers(tenancyId) {
  const tenancy = await getDocument(COLLECTIONS.TENANCIES, tenancyId);
  if (!tenancy) return null;
  
  const members = await queryDocuments(
    COLLECTIONS.TENANCY_MEMBERS,
    [{ field: "tenancyId", operator: "==", value: tenancyId }]
  );
  
  // Fetch user details for each member
  const membersWithDetails = await Promise.all(
    members.map(async (member) => {
      const user = await getDocument(COLLECTIONS.USERS, member.tenantUserId);
      return { ...member, user };
    })
  );
  
  return { ...tenancy, members: membersWithDetails };
}

export async function activateTenancy(tenancyId) {
  const tenancy = await getDocument(COLLECTIONS.TENANCIES, tenancyId);
  if (!tenancy) throw new Error("Tenancy not found");
  
  // Update tenancy status
  await updateDocument(COLLECTIONS.TENANCIES, tenancyId, { status: "active" });
  
  // Update unit status
  await updateDocument(COLLECTIONS.UNITS, tenancy.unitId, {
    status: "occupied",
    currentTenancyId: tenancyId,
  });
  
  // Update property counts
  await updatePropertyUnitCounts(tenancy.propertyId);
}

// ============================================================================
// Rent Charge Operations
// ============================================================================

export async function createRentCharge(tenancyId, data) {
  const tenancy = await getDocument(COLLECTIONS.TENANCIES, tenancyId);
  if (!tenancy) throw new Error("Tenancy not found");
  
  const chargeData = {
    tenancyId,
    ownerId: tenancy.ownerId,
    unitId: tenancy.unitId,
    responsibleTenantId: data.responsibleTenantId || null,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    dueDate: data.dueDate,
    amount: data.amount || tenancy.rentAmount,
    amountDue: data.amount || tenancy.rentAmount,
    currency: data.currency || tenancy.currency,
    description: data.description || "Monthly Rent",
    status: "upcoming",
    paidAmount: 0,
    paidAt: null,
  };
  
  return createDocument(COLLECTIONS.RENT_CHARGES, chargeData);
}

export async function getRentChargesByOwner(ownerId, status = null) {
  const conditions = [{ field: "ownerId", operator: "==", value: ownerId }];
  if (status) {
    conditions.push({ field: "status", operator: "==", value: status });
  }
  return queryDocuments(COLLECTIONS.RENT_CHARGES, conditions, { field: "dueDate", direction: "desc" });
}

export async function getRentChargesByTenancy(tenancyId) {
  return queryDocuments(
    COLLECTIONS.RENT_CHARGES,
    [{ field: "tenancyId", operator: "==", value: tenancyId }],
    { field: "dueDate", direction: "desc" }
  );
}

export async function recordPayment(chargeId, data) {
  return recordRentPayment(chargeId, data, data.recordedBy || null);
}

/** Period key YYYY-MM for idempotent monthly generation */
export function rentPeriodKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function periodBounds(year, month) {
  const period = rentPeriodKey(year, month);
  const lastDay = daysInMonth(year, month);
  return {
    period,
    periodStart: `${period}-01`,
    periodEnd: `${period}-${String(lastDay).padStart(2, "0")}`,
  };
}

function computeDueDate(year, month, dueDay = 1) {
  const lastDay = daysInMonth(year, month);
  const day = Math.min(Math.max(1, Number(dueDay) || 1), lastDay);
  return `${rentPeriodKey(year, month)}-${String(day).padStart(2, "0")}`;
}

function deriveChargeStatus(amountDue, paidAmount, dueDate, todayIso) {
  if (paidAmount <= 0) {
    if (todayIso < dueDate) return "upcoming";
    if (todayIso === dueDate) return "due";
    return "overdue";
  }
  if (paidAmount + 0.001 >= amountDue) return "paid";
  if (todayIso > dueDate) return "overdue"; // partial but past due — still show overdue-ish; use partial
  return "partial";
}

export async function getAllRentCharges(filters = {}) {
  const conditions = [];
  if (filters.status) {
    conditions.push({ field: "status", operator: "==", value: filters.status });
  }
  if (filters.period) {
    conditions.push({ field: "period", operator: "==", value: filters.period });
  }
  if (filters.propertyId) {
    conditions.push({ field: "propertyId", operator: "==", value: filters.propertyId });
  }
  if (filters.allocationId) {
    conditions.push({ field: "allocationId", operator: "==", value: filters.allocationId });
  }
  return queryDocuments(
    COLLECTIONS.RENT_CHARGES,
    conditions,
    { field: "dueDate", direction: "desc" },
    300
  );
}

export async function getRentChargeByAllocationPeriod(allocationId, period) {
  const rows = await queryDocuments(COLLECTIONS.RENT_CHARGES, [
    { field: "allocationId", operator: "==", value: allocationId },
    { field: "period", operator: "==", value: period },
  ]);
  return rows[0] || null;
}

export async function getPaymentsForCharge(chargeId) {
  return queryDocuments(
    COLLECTIONS.PAYMENTS,
    [{ field: "rentChargeId", operator: "==", value: chargeId }],
    { field: "createdAt", direction: "desc" }
  );
}

/**
 * Idempotent monthly rent generation from reserved/active allocations.
 * Rerun skips existing allocationId+period rows.
 * Mid-month start without a proration rule → charge flagged needsProrationReview (full amount not invented).
 */
export async function generateMonthlyRentCharges(
  { year, month, dueDay = 1, prorationRule = null },
  actorUserId = null
) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) throw new Error("Valid year and month required");

  const { period, periodStart, periodEnd } = periodBounds(y, m);
  const dueDate = computeDueDate(y, m, dueDay);
  const todayIso = new Date().toISOString().slice(0, 10);

  const allocations = await getAllAllocations();
  const billable = allocations.filter((a) =>
    ["reserved", "active"].includes(a.status)
  );

  const results = { created: [], skipped: [], flagged: [], period, dueDate };

  for (const allocation of billable) {
    const existing = await getRentChargeByAllocationPeriod(allocation.id, period);
    if (existing) {
      results.skipped.push({ allocationId: allocation.id, chargeId: existing.id });
      continue;
    }

    // Outside tenancy window?
    if (allocation.startDate && allocation.startDate > periodEnd) {
      results.skipped.push({ allocationId: allocation.id, reason: "starts_after_period" });
      continue;
    }
    if (allocation.plannedEndDate && allocation.plannedEndDate < periodStart) {
      results.skipped.push({ allocationId: allocation.id, reason: "ended_before_period" });
      continue;
    }
    if (allocation.actualEndDate && allocation.actualEndDate < periodStart) {
      results.skipped.push({ allocationId: allocation.id, reason: "ended_before_period" });
      continue;
    }

    let amountDue = Number(allocation.agreedMonthlyRent) || 0;
    let needsProrationReview = false;
    let description = `Rent ${period}`;

    // Prefer approved/issued contract terms when present
    let contractId = null;
    try {
      const contracts = await queryDocuments(COLLECTIONS.CONTRACTS, [
        { field: "allocationId", operator: "==", value: allocation.id },
      ]);
      const activeContract = contracts.find((c) =>
        ["approved", "issued", "signed"].includes(c.status)
      );
      if (activeContract) {
        contractId = activeContract.id;
        if (activeContract.monthlyRent != null) {
          amountDue = Number(activeContract.monthlyRent) || amountDue;
        }
      }
    } catch {
      /* optional */
    }

    if (!amountDue) {
      results.flagged.push({
        allocationId: allocation.id,
        reason: "missing_rent_amount",
      });
      continue;
    }

    const startsMidMonth =
      allocation.startDate &&
      allocation.startDate > periodStart &&
      allocation.startDate <= periodEnd;
    const endsMidMonth =
      (allocation.plannedEndDate || allocation.actualEndDate) &&
      (allocation.plannedEndDate || allocation.actualEndDate) >= periodStart &&
      (allocation.plannedEndDate || allocation.actualEndDate) < periodEnd;

    if ((startsMidMonth || endsMidMonth) && !prorationRule) {
      needsProrationReview = true;
      description = `Rent ${period} — REVIEW: mid-month start/end; no proration rule configured`;
    }

    let status = deriveChargeStatus(amountDue, 0, dueDate, todayIso);
    if (needsProrationReview) status = "disputed"; // under review until manager corrects

    const chargeId = await createDocument(COLLECTIONS.RENT_CHARGES, {
      allocationId: allocation.id,
      contractId,
      tenancyId: null,
      propertyId: allocation.propertyId || null,
      roomId: allocation.roomId || null,
      bedId: allocation.bedId || null,
      tenantUserId: allocation.tenantUserId || null,
      responsibleTenantId: allocation.tenantUserId || null,
      applicantName: allocation.applicantName || "",
      applicantEmail: allocation.applicantEmail || "",
      ownerId: allocation.ownerId || null,
      ownerRecordId: allocation.ownerRecordId || null,
      period,
      periodStart,
      periodEnd,
      dueDate,
      amount: amountDue,
      amountDue,
      currency: allocation.currency || "EUR",
      description,
      status,
      paidAmount: 0,
      balance: amountDue,
      paidAt: null,
      needsProrationReview,
      reminderCount: 0,
      lastReminderAt: null,
      adjustments: [],
      generatedBy: actorUserId,
      source: "monthly_job",
    });

    if (needsProrationReview) {
      results.flagged.push({ allocationId: allocation.id, chargeId, reason: "proration_review" });
    } else {
      results.created.push({ allocationId: allocation.id, chargeId });
    }

    if (actorUserId) {
      await createAuditLog(actorUserId, "rent.charge.create", "rent_charge", chargeId, null, {
        period,
        allocationId: allocation.id,
      });
    }
  }

  return results;
}

/**
 * Record full/partial payment; recalculate balance; audit.
 * Does not store card numbers — method/reference only.
 */
export async function recordRentPayment(chargeId, data, actorUserId = null) {
  const charge = await getDocument(COLLECTIONS.RENT_CHARGES, chargeId);
  if (!charge) throw new Error("Charge not found");
  if (["cancelled", "waived"].includes(charge.status)) {
    throw new Error(`Cannot record payment on ${charge.status} charge`);
  }

  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error("Payment amount must be positive");

  const amountDue = Number(charge.amountDue ?? charge.amount) || 0;
  const prevPaid = Number(charge.paidAmount) || 0;
  const newPaidAmount = Math.round((prevPaid + amount) * 100) / 100;
  const balance = Math.round((amountDue - newPaidAmount) * 100) / 100;
  const todayIso = new Date().toISOString().slice(0, 10);
  let status = deriveChargeStatus(amountDue, newPaidAmount, charge.dueDate, todayIso);
  if (newPaidAmount + 0.001 >= amountDue) status = "paid";
  else if (newPaidAmount > 0) status = "partial";

  const paymentData = {
    rentChargeId: chargeId,
    allocationId: charge.allocationId || null,
    contractId: charge.contractId || null,
    tenancyId: charge.tenancyId || null,
    propertyId: charge.propertyId || null,
    ownerId: charge.ownerId || null,
    tenantUserId: charge.tenantUserId || charge.responsibleTenantId || null,
    payerId: data.payerId || charge.tenantUserId || null,
    amount,
    currency: charge.currency || "EUR",
    method: data.method || "bank_transfer",
    reference: data.reference || "",
    paymentDate: data.paymentDate || todayIso,
    isManual: true,
    notes: data.notes || "",
    status: "succeeded",
    recordedBy: actorUserId,
    paidAt: serverTimestamp(),
  };

  const paymentId = await createDocument(COLLECTIONS.PAYMENTS, paymentData);

  await updateDocument(COLLECTIONS.RENT_CHARGES, chargeId, {
    paidAmount: newPaidAmount,
    balance: Math.max(0, balance),
    status,
    paidAt: status === "paid" ? serverTimestamp() : charge.paidAt || null,
    lastPaymentId: paymentId,
    lastPaymentAt: serverTimestamp(),
  });

  if (actorUserId) {
    await createAuditLog(actorUserId, "rent.payment.record", "payment", paymentId, null, {
      chargeId,
      amount,
      newPaidAmount,
      status,
    });
  }

  if (charge.tenantUserId) {
    await createNotification(charge.tenantUserId, "payment_recorded", {
      title: "Payment recorded",
      message: `€${amount.toLocaleString()} recorded for period ${charge.period || ""}.`,
      link: "/my-home/rent",
      entityType: "rent_charge",
      entityId: chargeId,
    });
  }

  return { paymentId, paidAmount: newPaidAmount, balance: Math.max(0, balance), status };
}

export async function adjustRentCharge(chargeId, { amountDue, reason, waive }, actorUserId) {
  const charge = await getDocument(COLLECTIONS.RENT_CHARGES, chargeId);
  if (!charge) throw new Error("Charge not found");

  const updates = {
    adjustments: [
      ...(charge.adjustments || []),
      {
        at: new Date().toISOString(),
        by: actorUserId,
        reason: reason || "",
        previousAmount: charge.amountDue ?? charge.amount,
        newAmount: waive ? 0 : amountDue,
        waive: Boolean(waive),
      },
    ],
  };

  if (waive) {
    updates.amountDue = 0;
    updates.amount = 0;
    updates.balance = 0;
    updates.status = "waived";
  } else if (amountDue != null) {
    const paid = Number(charge.paidAmount) || 0;
    const due = Number(amountDue);
    updates.amountDue = due;
    updates.amount = due;
    updates.balance = Math.max(0, Math.round((due - paid) * 100) / 100);
    updates.needsProrationReview = false;
    const todayIso = new Date().toISOString().slice(0, 10);
    updates.status =
      paid + 0.001 >= due
        ? "paid"
        : paid > 0
          ? "partial"
          : deriveChargeStatus(due, paid, charge.dueDate, todayIso);
  }

  await updateDocument(COLLECTIONS.RENT_CHARGES, chargeId, updates);
  if (actorUserId) {
    await createAuditLog(actorUserId, "rent.charge.adjust", "rent_charge", chargeId, reason);
  }
}

/** Refresh upcoming/due/overdue for unpaid charges (safe to rerun). */
export async function refreshRentChargeStatuses(actorUserId = null) {
  const charges = await getAllRentCharges();
  const todayIso = new Date().toISOString().slice(0, 10);
  let updated = 0;
  for (const c of charges) {
    if (["paid", "waived", "cancelled"].includes(c.status)) continue;
    const amountDue = Number(c.amountDue ?? c.amount) || 0;
    const paid = Number(c.paidAmount) || 0;
    if (c.needsProrationReview && c.status === "disputed") continue;
    let next;
    if (paid + 0.001 >= amountDue) next = "paid";
    else if (paid > 0) next = "partial";
    else next = deriveChargeStatus(amountDue, paid, c.dueDate, todayIso);
    // partial past due stays partial (dashboard can highlight)
    if (next !== c.status) {
      await updateDocument(COLLECTIONS.RENT_CHARGES, c.id, { status: next });
      updated++;
    }
  }
  if (actorUserId) {
    await createAuditLog(actorUserId, "rent.charges.refresh", "rent_charge", null, null, {
      updated,
    });
  }
  return { updated };
}

// ============================================================================
// Request/Maintenance Operations
// ============================================================================

export async function createRequest(tenancyId, createdBy, data) {
  const tenancy = await getDocument(COLLECTIONS.TENANCIES, tenancyId);
  if (!tenancy) throw new Error("Tenancy not found");
  
  const requestData = {
    tenancyId,
    ownerId: tenancy.ownerId,
    unitId: tenancy.unitId,
    createdBy,
    category: data.category,
    priority: data.priority || "medium",
    title: data.title,
    description: data.description || "",
    attachments: data.attachments || [],
    preferredTimes: data.preferredTimes || "",
    status: "new",
    assigneeId: null,
    resolvedAt: null,
    resolutionNote: "",
  };
  
  return createDocument(COLLECTIONS.REQUESTS, requestData);
}

export async function getRequestsByOwner(ownerId, status = null) {
  const conditions = [{ field: "ownerId", operator: "==", value: ownerId }];
  if (status) {
    if (Array.isArray(status)) {
      conditions.push({ field: "status", operator: "in", value: status });
    } else {
      conditions.push({ field: "status", operator: "==", value: status });
    }
  }
  return queryDocuments(COLLECTIONS.REQUESTS, conditions, { field: "createdAt", direction: "desc" });
}

export async function getOpenRequestsByOwner(ownerId) {
  return getRequestsByOwner(ownerId, ["new", "acknowledged", "in_progress", "waiting_for_tenant"]);
}

export async function updateRequestStatus(requestId, status, note = "", actorUserId = null) {
  const existing = await getDocument(COLLECTIONS.REQUESTS, requestId);
  if (!existing) throw new Error("Request not found");

  const history = [
    ...(existing.statusHistory || []),
    {
      from: existing.status,
      to: status,
      at: new Date().toISOString(),
      by: actorUserId,
      note: note || "",
    },
  ];

  const updates = { status, statusHistory: history };
  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp();
    updates.resolutionNote = note;
  }
  if (status === "assigned" || status === "in_progress") {
    updates.assigneeId = actorUserId || existing.assigneeId || null;
  }
  await updateDocument(COLLECTIONS.REQUESTS, requestId, updates);
  if (actorUserId) {
    await createAuditLog(actorUserId, "maintenance.status", "request", requestId, null, {
      status,
    });
  }
}

export async function addRequestComment(requestId, authorId, message, attachment = null) {
  const commentData = {
    requestId,
    authorId,
    message,
    attachmentKey: attachment,
  };
  return createDocument(COLLECTIONS.REQUEST_COMMENTS, commentData);
}

// ============================================================================
// Document Operations
// ============================================================================

export async function createDocumentRequest(tenancyId, tenantUserId, documentType, data = {}) {
  const requestData = {
    tenancyId,
    tenantUserId,
    documentType,
    required: data.required !== false,
    dueDate: data.dueDate || null,
    notes: data.notes || "",
    status: "requested",
  };
  return createDocument(COLLECTIONS.DOCUMENT_REQUESTS, requestData);
}

export async function uploadDocument(tenantUserId, data) {
  const docData = {
    ownerUserId: tenantUserId,
    relatedTenancyId: data.tenancyId || null,
    relatedAllocationId: data.allocationId || null,
    documentRequestId: data.documentRequestId || null,
    documentType: data.documentType,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    storageKey: data.storageKey, // base64 data URL
    storagePath: data.storagePath || null,
    reviewStatus: "uploaded",
    reviewNote: "",
    expiresAt: data.expiresAt || null,
  };

  const docId = await createDocument(COLLECTIONS.DOCUMENTS, docData);

  if (data.documentRequestId) {
    await updateDocument(COLLECTIONS.DOCUMENT_REQUESTS, data.documentRequestId, {
      status: "uploaded",
    });
  }

  return docId;
}

/** Firestore docs max ~1MB — keep base64 payload comfortably under that */
const DOC_BASE64_MAX_BYTES = 700 * 1024;
const DOC_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Save a tenant document as a base64 data URL in Firestore (no Firebase Storage).
 */
export async function uploadTenantDocumentFile(
  tenantUserId,
  { file, documentType, documentRequestId = null, tenancyId = null, allocationId = null }
) {
  if (!tenantUserId) throw new Error("Sign in required");
  if (!file) throw new Error("Choose a file to upload");
  if (!documentType) throw new Error("Document type required");

  if (file.size > DOC_BASE64_MAX_BYTES) {
    throw new Error(
      "File must be 700KB or smaller (stored as base64 in the database). Compress the PDF/image and try again."
    );
  }

  const mime = file.type || "application/octet-stream";
  const okType =
    DOC_ALLOWED_TYPES.has(mime) ||
    /\.(pdf|jpe?g|png|webp)$/i.test(file.name || "");
  if (!okType) {
    throw new Error("Use PDF, JPG, or PNG only");
  }

  const storageKey = await fileToDataUrl(file);

  return uploadDocument(tenantUserId, {
    documentType,
    documentRequestId,
    tenancyId,
    allocationId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: mime,
    storageKey,
    storagePath: null,
  });
}

export async function reviewDocument(documentId, status, note = "") {
  await updateDocument(COLLECTIONS.DOCUMENTS, documentId, {
    reviewStatus: status,
    reviewNote: note,
  });
}

// ============================================================================
// Messaging Operations
// ============================================================================

export async function getOrCreateConversation({
  participantIds,
  contextType,
  contextId,
  listingId = null,
  listingTitle = "",
  initialMessage = null,
  senderId = null,
}) {
  const sorted = [...participantIds].sort();
  const existing = await queryDocuments(COLLECTIONS.CONVERSATIONS, [
    { field: "contextType", operator: "==", value: contextType },
    { field: "contextId", operator: "==", value: contextId },
  ]);

  if (existing.length > 0) {
    const conversationId = existing[0].id;
    if (initialMessage && senderId) {
      await sendMessage(conversationId, senderId, initialMessage);
    }
    return conversationId;
  }

  const conversationId = await createDocument(COLLECTIONS.CONVERSATIONS, {
    participantIds: sorted,
    contextType,
    contextId,
    listingId,
    listingTitle,
    lastMessage: initialMessage || "",
    lastMessageAt: initialMessage ? serverTimestamp() : null,
    lastSenderId: senderId || null,
  });

  await Promise.all(
    sorted.map((userId) =>
      createDocument(COLLECTIONS.CONVERSATION_MEMBERS, {
        conversationId,
        userId,
        lastReadAt: null,
      })
    )
  );

  if (initialMessage && senderId) {
    await sendMessage(conversationId, senderId, initialMessage);
  }

  return conversationId;
}

export async function getConversationsForUser(userId) {
  const conversations = await queryDocuments(
    COLLECTIONS.CONVERSATIONS,
    [{ field: "participantIds", operator: "array-contains", value: userId }],
    { field: "lastMessageAt", direction: "desc" }
  );

  return Promise.all(
    conversations.map(async (conv) => {
      const otherId = (conv.participantIds || []).find((id) => id !== userId);
      const otherUser = otherId ? await getDocument(COLLECTIONS.USERS, otherId) : null;
      return { ...conv, otherUser, otherId };
    })
  );
}

export async function sendMessage(conversationId, senderId, body, attachmentKey = null) {
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const conversation = await getDocument(COLLECTIONS.CONVERSATIONS, conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const messageId = await createDocument(COLLECTIONS.MESSAGES, {
    conversationId,
    senderId,
    senderType: "user",
    body: trimmed,
    attachmentKey,
    readBy: [senderId],
    // Phase 9 — denormalized for future tighter message read rules
    participantIds: conversation.participantIds || [],
  });

  await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
  });

  const recipients = (conversation.participantIds || []).filter((id) => id !== senderId);
  await Promise.all(
    recipients.map(async (userId) => {
      const recipient = await getDocument(COLLECTIONS.USERS, userId);
      const messagesPath =
        recipient?.role === "owner" ? "/dashboard/messages" : "/my-home/messages";
      return createNotification(userId, "message_new", {
        title: "New message",
        message: trimmed.slice(0, 120),
        link: `${messagesPath}?c=${conversationId}`,
        entityType: "conversation",
        entityId: conversationId,
      });
    })
  );

  return messageId;
}

export async function getMessages(conversationId) {
  return queryDocuments(
    COLLECTIONS.MESSAGES,
    [{ field: "conversationId", operator: "==", value: conversationId }],
    { field: "createdAt", direction: "asc" }
  );
}

export async function markConversationRead(conversationId, userId) {
  const members = await queryDocuments(COLLECTIONS.CONVERSATION_MEMBERS, [
    { field: "conversationId", operator: "==", value: conversationId },
    { field: "userId", operator: "==", value: userId },
  ]);
  if (members[0]) {
    await updateDocument(COLLECTIONS.CONVERSATION_MEMBERS, members[0].id, {
      lastReadAt: serverTimestamp(),
    });
  }
}

/**
 * Public website enquiry — creates/opens a website-channel thread.
 * Guests may be signed out (no list queries). Pass existingConversationId from localStorage.
 */
export async function startWebsiteEnquiry({
  guestName,
  guestEmail,
  guestPhone = "",
  body,
  propertyId = null,
  topic = "general",
  existingConversationId = null,
}) {
  const hardening = await getHardeningSettings().catch(() => null);
  if (hardening?.maintenanceMode) {
    throw new Error("The site is temporarily unavailable. Please try again later.");
  }
  if (hardening && hardening.publicChatEnabled === false) {
    throw new Error("Website chat is currently disabled.");
  }

  const email = String(guestEmail || "").trim().toLowerCase();
  const name = String(guestName || "").trim();
  const message = String(body || "").trim();
  if (!email || !message) throw new Error("Email and message are required");
  if (!name) throw new Error("Please enter your name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address");
  }
  if (message.length > 4000) throw new Error("Message is too long");

  let conversationId = existingConversationId || null;

  if (!conversationId) {
    conversationId = await createDocument(COLLECTIONS.CONVERSATIONS, {
      participantIds: [],
      channel: "website",
      status: "open",
      handoverState: "human",
      assignedManagerId: null,
      guestName: name,
      guestEmail: email,
      guestPhone: guestPhone || "",
      propertyId: propertyId || null,
      applicationId: null,
      topic,
      contextType: "website_enquiry",
      contextId: `web:${email}:${Date.now()}`,
      listingId: null,
      listingTitle: "",
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      lastSenderId: null,
      lastSenderType: "guest",
      internalNotes: "",
      unreadForStaff: true,
    });
  } else {
    try {
      await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, {
        lastMessage: message,
        lastMessageAt: serverTimestamp(),
        lastSenderType: "guest",
        status: "open",
        unreadForStaff: true,
      });
    } catch {
      /* staff-side metadata; message row below is enough */
    }
  }

  await createDocument(COLLECTIONS.MESSAGES, {
    conversationId,
    senderId: null,
    senderType: "guest",
    guestName: name,
    guestEmail: email,
    body: message,
    attachmentKey: null,
    readBy: [],
    deliveryStatus: "received",
    participantIds: [],
  });

  // Sandbox email to desk — never sends externally in Phase 6
  try {
    await enqueueOutboundEmail({
      to: "desk@sandbox.local",
      subject: `Website enquiry from ${name}`,
      template: "website_enquiry_staff",
      payload: { conversationId, guestEmail: email, topic },
      idempotencyKey: `enquiry-notify:${conversationId}:${Date.now()}`,
      relatedConversationId: conversationId,
    });
  } catch {
    /* guests cannot always write delivery logs — staff path still works */
  }

  return conversationId;
}

export async function getStaffInboxConversations(filters = {}) {
  let rows = await queryDocuments(
    COLLECTIONS.CONVERSATIONS,
    [],
    { field: "lastMessageAt", direction: "desc" },
    100
  );
  // Include threads with no lastMessageAt yet
  if (!rows.length) {
    rows = await queryDocuments(COLLECTIONS.CONVERSATIONS, [], null, 100);
  }
  if (filters.channel) {
    rows = rows.filter((c) => (c.channel || "in_app") === filters.channel);
  }
  if (filters.status) {
    rows = rows.filter((c) => (c.status || "open") === filters.status);
  }
  if (filters.assignedManagerId) {
    rows = rows.filter((c) => c.assignedManagerId === filters.assignedManagerId);
  }
  return rows.sort((a, b) => {
    const ta = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds * 1000 || 0;
    const tb = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds * 1000 || 0;
    return tb - ta;
  });
}

export async function updateInboxConversation(conversationId, data, actorUserId = null) {
  const allowed = {
    status: data.status,
    assignedManagerId: data.assignedManagerId,
    handoverState: data.handoverState,
    internalNotes: data.internalNotes,
    propertyId: data.propertyId,
    unreadForStaff: data.unreadForStaff,
  };
  const patch = {};
  Object.entries(allowed).forEach(([k, v]) => {
    if (v !== undefined) patch[k] = v;
  });
  await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, patch);
  if (actorUserId) {
    await createAuditLog(actorUserId, "inbox.update", "conversation", conversationId, null, patch);
  }
}

export async function sendStaffInboxReply(conversationId, staffUserId, body) {
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const conversation = await getDocument(COLLECTIONS.CONVERSATIONS, conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const messageId = await createDocument(COLLECTIONS.MESSAGES, {
    conversationId,
    senderId: staffUserId,
    senderType: "staff",
    body: trimmed,
    participantIds: conversation.participantIds || [],
    attachmentKey: null,
    readBy: [staffUserId],
    deliveryStatus: "sent_in_app",
  });

  const participantIds = Array.from(
    new Set([...(conversation.participantIds || []), staffUserId])
  );

  await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId: staffUserId,
    lastSenderType: "staff",
    participantIds,
    handoverState: "human",
    unreadForStaff: false,
    status: conversation.status === "resolved" ? "open" : conversation.status || "open",
  });

  // Sandbox email to guest when website channel
  if (conversation.channel === "website" && conversation.guestEmail) {
    await enqueueOutboundEmail({
      to: conversation.guestEmail,
      subject: "Reply from Wohnbrücke",
      template: "website_reply_guest",
      payload: { conversationId, preview: trimmed.slice(0, 120) },
      idempotencyKey: `guest-reply:${messageId}`,
      relatedConversationId: conversationId,
      relatedMessageId: messageId,
    });
  }

  return messageId;
}

/**
 * Resolve email endpoint:
 * - Production (Vercel): always same-origin /api/send
 * - Local only: VITE_EMAIL_API_URL=http://localhost:8787 (never baked into prod builds)
 */
function resolveEmailEndpoint() {
  const configured = String(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_EMAIL_API_URL) ||
      ""
  ).replace(/\/$/, "");

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const onLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "";

  // A production build must never call a developer laptop (common misconfig)
  const isLocalDevUrl = /localhost|127\.0\.0\.1/.test(configured);
  if (!configured || (isLocalDevUrl && !onLocalHost)) {
    return "/api/send";
  }
  if (configured.endsWith("/api/send") || configured.endsWith("/send")) {
    return configured;
  }
  return `${configured}/send`;
}

async function postEmailApi(endpoint, { to, subject, template, payload }) {
  const headers = { "Content-Type": "application/json" };
  if (auth.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, subject, template, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Email API HTTP ${res.status}`);
  }
  return { messageId: data.messageId || null, via: "email_api" };
}

/**
 * Live send via Vercel / local email API (staff Firebase login), then Cloud Function.
 */
async function sendLiveEmail({ to, subject, template, payload }) {
  const endpoint = resolveEmailEndpoint();
  const body = { to, subject, template, payload };
  let lastHttpError = null;

  try {
    return await postEmailApi(endpoint, body);
  } catch (httpErr) {
    lastHttpError = httpErr;
    // If a custom/local URL failed, still try same-origin Vercel function
    if (endpoint !== "/api/send") {
      try {
        return await postEmailApi("/api/send", body);
      } catch (apiErr) {
        lastHttpError = apiErr;
      }
    }
  }

  try {
    const sendOutboundEmail = httpsCallable(functions, "sendOutboundEmail");
    const result = await sendOutboundEmail(body);
    return {
      messageId: result.data?.messageId || null,
      via: "cloud_function",
    };
  } catch (err) {
    const httpMsg = lastHttpError?.message || "";
    const msg = err.message || String(err);
    throw new Error(
      [httpMsg, msg]
        .filter(Boolean)
        .join(" · ")
        .concat(
          " — On Vercel set GMAIL_USER, GMAIL_APP_PASSWORD, FIREBASE_WEB_API_KEY, FIREBASE_PROJECT_ID and redeploy. Do not set VITE_EMAIL_API_URL in production."
        )
    );
  }
}

/**
 * Outbound email.
 * - sandbox: log only (default)
 * - live: VITE_EMAIL_API_URL server (no Blaze) OR Cloud Function sendOutboundEmail
 * Idempotent on idempotencyKey.
 */
export async function enqueueOutboundEmail({
  to,
  subject,
  template,
  payload = {},
  idempotencyKey,
  relatedConversationId = null,
  relatedMessageId = null,
  actorUserId = null,
}) {
  if (!to || !subject) throw new Error("Email to and subject required");
  const key = idempotencyKey || `email:${to}:${subject}:${Date.now()}`;

  const existing = await queryDocuments(COLLECTIONS.MESSAGE_DELIVERY_LOGS, [
    { field: "idempotencyKey", operator: "==", value: key },
  ]);
  if (existing[0]) {
    return { id: existing[0].id, skipped: true, log: existing[0] };
  }

  let mode = "sandbox";
  try {
    const hardening = await getHardeningSettings();
    if (hardening?.emailMode === "live") mode = "live";
  } catch {
    /* */
  }
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_EMAIL_MODE === "live"
  ) {
    mode = "live";
  }

  const liveRequested = mode === "live";
  const isCredsTemplate = String(template || "").startsWith("renter_credentials");

  const log = {
    channel: "email",
    mode: liveRequested ? "live" : "sandbox",
    to: String(to).trim().toLowerCase(),
    subject: String(subject).slice(0, 200),
    template: template || "generic",
    payloadSummary: isCredsTemplate
      ? { ...(payload || {}), conversationId: relatedConversationId }
      : {
          keys: Object.keys(payload || {}),
          conversationId: relatedConversationId,
        },
    status: liveRequested ? "queued" : "sandbox_logged",
    attempts: 1,
    maxAttempts: 5,
    idempotencyKey: key,
    relatedConversationId,
    relatedMessageId,
    providerMessageId: null,
    lastError: null,
    nextRetryAt: null,
    createdBy: actorUserId,
  };

  if (liveRequested) {
    try {
      const result = await sendLiveEmail({
        to: log.to,
        subject: log.subject,
        template: log.template,
        payload,
      });
      log.status = "sent";
      log.providerMessageId = result.messageId || null;
      log.mode = result.via || "live";
      // Do not keep temporary passwords in Firestore after a successful live send
      if (isCredsTemplate && log.payloadSummary?.temporaryPassword) {
        log.payloadSummary = {
          ...log.payloadSummary,
          temporaryPassword: "[sent — redacted]",
        };
      }
    } catch (err) {
      log.status = "failed";
      log.mode = "live";
      log.lastError = err.message || "Live email send failed";
    }
  }

  const id = await createDocument(COLLECTIONS.MESSAGE_DELIVERY_LOGS, log);
  return { id, skipped: false, log: { id, ...log } };
}

export async function getDeliveryLogs(limitCount = 50) {
  const rows = await queryDocuments(
    COLLECTIONS.MESSAGE_DELIVERY_LOGS,
    [],
    { field: "createdAt", direction: "desc" },
    limitCount
  );
  return rows;
}

export async function retryDeliveryLog(logId, actorUserId = null) {
  const log = await getDocument(COLLECTIONS.MESSAGE_DELIVERY_LOGS, logId);
  if (!log) throw new Error("Delivery log not found");
  if (log.attempts >= (log.maxAttempts || 5)) {
    throw new Error("Max retry attempts reached");
  }

  // Still sandbox — bump attempt, do not send externally
  await updateDocument(COLLECTIONS.MESSAGE_DELIVERY_LOGS, logId, {
    attempts: (log.attempts || 1) + 1,
    status: "sandbox_logged",
    lastError: "Retry recorded in sandbox — no external send",
    lastRetryAt: serverTimestamp(),
    retriedBy: actorUserId,
  });

  if (actorUserId) {
    await createAuditLog(actorUserId, "email.retry", "message_delivery_log", logId);
  }
  return logId;
}

// ============================================================================
// Notification Operations
// ============================================================================

export async function createNotification(userId, type, data) {
  const notificationData = {
    userId,
    type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    entityType: data.entityType || null,
    entityId: data.entityId || null,
    channel: "in_app",
    status: "unread",
    sentAt: serverTimestamp(),
    readAt: null,
  };
  return createDocument(COLLECTIONS.NOTIFICATIONS, notificationData);
}

export async function getNotificationsByUser(userId, unreadOnly = false) {
  const conditions = [{ field: "userId", operator: "==", value: userId }];
  if (unreadOnly) {
    conditions.push({ field: "status", operator: "==", value: "unread" });
  }
  return queryDocuments(COLLECTIONS.NOTIFICATIONS, conditions, { field: "sentAt", direction: "desc" }, 50);
}

export async function markNotificationAsRead(notificationId) {
  await updateDocument(COLLECTIONS.NOTIFICATIONS, notificationId, {
    status: "read",
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsAsRead(userId) {
  const notifications = await getNotificationsByUser(userId, true);
  const batch = writeBatch(db);
  
  notifications.forEach((notification) => {
    const ref = doc(db, COLLECTIONS.NOTIFICATIONS, notification.id);
    batch.update(ref, { status: "read", readAt: serverTimestamp() });
  });
  
  await batch.commit();
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Realtime unread notifications for a user.
 * Uses a single equality filter (no composite index required), then filters/sorts client-side.
 */
export function subscribeToNotifications(userId, callback, onError) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where("userId", "==", userId),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((n) => n.status === "unread")
        .sort((a, b) => {
          const at = a.sentAt?.toMillis?.() ?? (a.sentAt ? new Date(a.sentAt).getTime() : 0);
          const bt = b.sentAt?.toMillis?.() ?? (b.sentAt ? new Date(b.sentAt).getTime() : 0);
          return bt - at;
        })
        .slice(0, 20);
      callback(notifications);
    },
    (err) => {
      console.warn("[firestore] notifications listener:", err?.message || err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToMessages(conversationId, callback, onError) {
  // Prefer ordered query; fall back is handled by caller if index is missing
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(messages);
    },
    (err) => {
      console.warn("[firestore] messages listener:", err?.message || err);
      if (onError) onError(err);
    }
  );
}

// ============================================================================
// Analytics/Stats Operations
// ============================================================================

export async function getOwnerStats(ownerId) {
  const [properties, units, listings, tenancies, rentCharges, requests] = await Promise.all([
    getPropertiesByOwner(ownerId),
    getUnitsByOwner(ownerId),
    getListingsByOwner(ownerId),
    getTenanciesByOwner(ownerId),
    getRentChargesByOwner(ownerId),
    getRequestsByOwner(ownerId),
  ]);
  
  const activeUnits = units.filter((u) => u.status === "occupied").length;
  const activeTenancies = tenancies.filter((t) => t.status === "active").length;
  const publishedListings = listings.filter((l) => l.status === "published").length;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyCharges = rentCharges.filter((c) => {
    const dueDate = c.dueDate?.toDate ? c.dueDate.toDate() : new Date(c.dueDate);
    return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
  });
  
  const expectedRent = monthlyCharges.reduce((sum, c) => sum + c.amount, 0);
  const collectedRent = monthlyCharges.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const overdueCharges = rentCharges.filter((c) => c.status === "overdue");
  const openRequests = requests.filter((r) => !["resolved", "closed"].includes(r.status));
  
  return {
    totalProperties: properties.length,
    totalUnits: units.length,
    occupiedUnits: activeUnits,
    vacantUnits: units.length - activeUnits,
    occupancyRate: units.length > 0 ? Math.round((activeUnits / units.length) * 100) : 0,
    activeTenancies,
    publishedListings,
    expectedRent,
    collectedRent,
    collectionRate: expectedRent > 0 ? Math.round((collectedRent / expectedRent) * 100) : 0,
    overdueAmount: overdueCharges.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0),
    openRequests: openRequests.length,
    highPriorityRequests: openRequests.filter((r) => r.priority === "high" || r.priority === "urgent").length,
  };
}

// ============================================================================
// Audit Log
// ============================================================================

export async function createAuditLog(actorUserId, action, entityType, entityId, reason = null, metadata = {}) {
  return createDocument(COLLECTIONS.AUDIT_LOGS, {
    actorUserId,
    action,
    entityType,
    entityId,
    reason,
    metadata,
  });
}

// ============================================================================
// Owner Profile / Site / Domain Operations
// ============================================================================

export async function getOwnerProfile(userId) {
  return getDocument(COLLECTIONS.OWNER_PROFILES, userId);
}

export async function updateOwnerProfile(userId, data) {
  return updateDocument(COLLECTIONS.OWNER_PROFILES, userId, data);
}

export async function getOwnerSite(ownerId) {
  return getDocument(COLLECTIONS.OWNER_SITES, ownerId);
}

export async function getOwnerByPublicSlug(slug) {
  const sites = await queryDocuments(
    COLLECTIONS.OWNER_SITES,
    [
      { field: "publicSlug", operator: "==", value: slug },
      { field: "publicationStatus", operator: "==", value: "published" },
    ],
    null,
    1
  );
  if (!sites.length) return null;
  const site = sites[0];
  const profile = await getOwnerProfile(site.ownerId);
  const user = await getDocument(COLLECTIONS.USERS, site.ownerId);
  return { site, profile, user };
}

export async function getOwnerByIdForPublic(ownerId) {
  const [site, profile, user] = await Promise.all([
    getOwnerSite(ownerId),
    getOwnerProfile(ownerId),
    getDocument(COLLECTIONS.USERS, ownerId),
  ]);
  if (!site && !profile) return null;
  return { site, profile, user };
}

export async function getPayoutAccount(ownerId) {
  const accounts = await queryDocuments(
    COLLECTIONS.PAYOUT_ACCOUNTS,
    [{ field: "ownerId", operator: "==", value: ownerId }],
    { field: "createdAt", direction: "desc" },
    1
  );
  return accounts[0] || null;
}

export async function upsertPayoutAccount(ownerId, data) {
  const existing = await getPayoutAccount(ownerId);
  const payload = {
    ownerId,
    provider: data.provider || "bank_transfer",
    accountHolderName: data.accountHolderName || "",
    iban: data.iban || "",
    bic: data.bic || "",
    bankName: data.bankName || "",
    currency: data.currency || "EUR",
    verificationStatus: data.verificationStatus || "pending",
    externalAccountReference: data.externalAccountReference || null,
    notes: data.notes || "",
  };

  if (existing) {
    await updateDocument(COLLECTIONS.PAYOUT_ACCOUNTS, existing.id, payload);
    return existing.id;
  }
  return createDocument(COLLECTIONS.PAYOUT_ACCOUNTS, payload);
}

export async function getOwnerSubscription(ownerId) {
  const subs = await queryDocuments(
    COLLECTIONS.OWNER_SUBSCRIPTIONS,
    [{ field: "ownerId", operator: "==", value: ownerId }],
    { field: "createdAt", direction: "desc" },
    1
  );
  return subs[0] || null;
}

// ============================================================================
// Renter Profile Operations
// ============================================================================

export async function getRenterProfile(userId) {
  return getDocument(COLLECTIONS.RENTER_PROFILES, userId);
}

export async function updateRenterProfile(userId, data) {
  return updateDocument(COLLECTIONS.RENTER_PROFILES, userId, data);
}

export async function toggleSavedListing(userId, listingId) {
  const profile = await getRenterProfile(userId);
  if (!profile) return;

  const savedListings = [...(profile.savedListings || [])];
  const index = savedListings.indexOf(listingId);

  if (index > -1) {
    savedListings.splice(index, 1);
  } else {
    savedListings.push(listingId);
  }

  await updateRenterProfile(userId, { savedListings });
  return savedListings;
}

export async function assertOwnerOwnsResource(ownerId, resource) {
  if (!resource || resource.ownerId !== ownerId) {
    throw new Error("You do not have access to this resource");
  }
  return true;
}

// ============================================================================
// Staff invitations & bootstrap (Phase 1)
// ============================================================================

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function countAdmins() {
  const admins = await queryDocuments(COLLECTIONS.USERS, [
    { field: "role", operator: "==", value: "admin" },
  ]);
  return admins.length;
}

export async function getBootstrapSettings() {
  return getDocument(COLLECTIONS.PLATFORM_SETTINGS, "bootstrap");
}

export async function isBootstrapLocked() {
  const lock = await getDocument(COLLECTIONS.PLATFORM_SETTINGS, "lock");
  return Boolean(lock?.lockedAt || lock?.locked);
}

/**
 * Elevate first matching user to admin when bootstrap email matches and no lock.
 * Returns true if elevation occurred.
 */
export async function tryBootstrapAdmin(userId, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !userId) return false;

  if (await isBootstrapLocked()) return false;
  if ((await countAdmins()) > 0) return false;

  const bootstrap = await getBootstrapSettings();
  const expected = String(bootstrap?.bootstrapAdminEmail || "").trim().toLowerCase();
  if (!expected || expected !== normalized) return false;

  await updateDocument(COLLECTIONS.USERS, userId, {
    role: "admin",
    accountStatus: "active",
  });

  await createDocumentWithId(COLLECTIONS.PLATFORM_SETTINGS, "lock", {
    locked: true,
    lockedAt: serverTimestamp(),
    bootstrapUserId: userId,
    bootstrapEmail: normalized,
  });

  await createDocumentWithId(COLLECTIONS.STAFF_PROFILES, userId, {
    userId,
    role: "admin",
    displayTitle: "Platform Administrator",
    invitedBy: null,
    activatedAt: serverTimestamp(),
  });

  await createAuditLog(userId, "auth.bootstrap_admin", "user", userId, "bootstrap", {
    email: normalized,
  });

  return true;
}

export async function createStaffInvitation(invitedBy, { email, role, displayName = "" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required");
  if (!STAFF_ROLES.includes(role)) {
    throw new Error("Invalid staff role");
  }

  // Document ID === token so security rules can validate claims with get()
  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await createDocumentWithId(COLLECTIONS.STAFF_INVITATIONS, token, {
    email: normalizedEmail,
    role,
    displayName: displayName || "",
    token,
    status: "pending",
    invitedBy,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    usedBy: null,
  });

  await createAuditLog(invitedBy, "staff.invite.create", "staff_invitation", token, null, {
    email: normalizedEmail,
    role,
  });

  return { id: token, token, email: normalizedEmail, role, expiresAt: expiresAt.toISOString() };
}

export async function getStaffInvitationByToken(token) {
  if (!token) return null;
  return getDocument(COLLECTIONS.STAFF_INVITATIONS, token);
}

export async function listStaffInvitations() {
  return queryDocuments(
    COLLECTIONS.STAFF_INVITATIONS,
    [],
    { field: "createdAt", direction: "desc" },
    100
  );
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out}!1`;
}

async function findUserIdByEmail(email) {
  const rows = await queryDocuments(COLLECTIONS.USERS, [
    { field: "email", operator: "==", value: email },
  ]);
  return rows[0]?.id || null;
}

/**
 * Manager provisions a renter login with a temporary password, links the
 * allocation/application, and queues a credentials email (sandbox until SMTP live).
 * Uses a secondary Auth app so the manager session stays signed in.
 */
export async function provisionRenterAccountWithCredentials(
  actorUserId,
  {
    email,
    displayName = "",
    applicationId = null,
    allocationId = null,
    propertyId: _propertyId = null,
    phone = "",
  }
) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required");
  if (!actorUserId) throw new Error("Staff user required");

  const name = (displayName || normalizedEmail.split("@")[0] || "Tenant").trim();
  let uid = await findUserIdByEmail(normalizedEmail);
  let temporaryPassword = null;
  let createdAuth = false;
  let existingAccount = false;

  if (uid) {
    existingAccount = true;
    const existing = await getDocument(COLLECTIONS.USERS, uid);
    if (existing?.role && existing.role !== "renter") {
      throw new Error("That email already belongs to a non-renter account");
    }
    await updateDocument(COLLECTIONS.USERS, uid, {
      mustChangePassword: true,
      accountStatus: "active",
      displayName: name || existing?.displayName || "",
      phone: phone || existing?.phone || "",
    });
    // Existing Auth users: send reset link instead of inventing a new password client-side
    try {
      await sendPasswordResetEmail(getSecondaryAuth(), normalizedEmail);
    } catch {
      /* still link below */
    }
  } else {
    temporaryPassword = generateTemporaryPassword();
    const secondaryAuth = getSecondaryAuth();
    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedEmail,
        temporaryPassword
      );
      uid = cred.user.uid;
      createdAuth = true;
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        /* optional */
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error(
          "An Auth login already exists for this email but no app profile was found. Ask them to use Forgot password on /login, then link again."
        );
      }
      throw err;
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        /* */
      }
    }

    await setDoc(doc(db, COLLECTIONS.USERS, uid), {
      email: normalizedEmail,
      displayName: name,
      phone: phone || "",
      city: "",
      role: "renter",
      accountStatus: "active",
      emailVerified: false,
      emailVerifiedAt: null,
      mustChangePassword: true,
      provisionedBy: actorUserId,
      provisionedAt: serverTimestamp(),
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, COLLECTIONS.RENTER_PROFILES, uid), {
      userId: uid,
      verificationStatus: "pending",
      phone: phone || "",
      preferences: {
        cities: [],
        budgetMin: 0,
        budgetMax: 0,
        moveInDate: null,
        propertyTypes: [],
        furnished: null,
      },
      savedListings: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (applicationId) {
    await updateDocument(COLLECTIONS.APPLICATIONS, applicationId, {
      renterId: uid,
      applicantEmail: normalizedEmail,
      applicantName: name,
    });
  }

  if (allocationId) {
    await updateDocument(COLLECTIONS.ALLOCATIONS, allocationId, {
      tenantUserId: uid,
    });
  }

  const loginUrl =
    typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

  const emailBody = existingAccount
    ? {
        to: normalizedEmail,
        subject: "Your HomeRental login",
        template: "renter_credentials_existing",
        payload: {
          displayName: name,
          email: normalizedEmail,
          loginUrl,
          note: "An account already existed — a password reset email was requested. Change your password after sign-in if prompted.",
        },
        idempotencyKey: `renter-creds-existing:${uid}:${Date.now()}`,
        actorUserId,
      }
    : {
        to: normalizedEmail,
        subject: "Your HomeRental login credentials",
        template: "renter_credentials_new",
        payload: {
          displayName: name,
          email: normalizedEmail,
          temporaryPassword,
          loginUrl,
          note: "On first sign-in you will be asked to choose your own password.",
        },
        idempotencyKey: `renter-creds-new:${uid}:${Date.now()}`,
        actorUserId,
      };

  let delivery = null;
  try {
    delivery = await enqueueOutboundEmail(emailBody);
  } catch (err) {
    console.warn("Credentials email sandbox log failed:", err?.message || err);
  }

  await createAuditLog(actorUserId, "renter.provision", "user", uid, null, {
    email: normalizedEmail,
    createdAuth,
    existingAccount,
    applicationId,
    allocationId,
  });

  return {
    uid,
    email: normalizedEmail,
    displayName: name,
    temporaryPassword,
    createdAuth,
    existingAccount,
    loginUrl,
    deliveryLogId: delivery?.id || null,
    emailMode: delivery?.log?.mode || "sandbox",
    emailStatus: delivery?.log?.status || null,
    emailError: delivery?.log?.lastError || null,
  };
}

/** @deprecated Prefer provisionRenterAccountWithCredentials */
export async function createRenterInvitation(invitedBy, data) {
  const result = await provisionRenterAccountWithCredentials(invitedBy, data);
  return {
    ...result,
    path: "/login",
    token: null,
  };
}

export async function getRenterInvitationByToken(token) {
  if (!token) return null;
  return getDocument(COLLECTIONS.RENTER_INVITATIONS, token);
}

/**
 * Link signed-in renter to application / allocation from a pending invite.
 */
export async function claimRenterInvitation(token, userId, userEmail) {
  const invitation = await getRenterInvitationByToken(token);
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "pending") throw new Error("Invitation is no longer valid");

  const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await updateDocument(COLLECTIONS.RENTER_INVITATIONS, invitation.id, { status: "expired" });
    throw new Error("Invitation has expired");
  }

  const normalized = String(userEmail || "").trim().toLowerCase();
  if (normalized !== invitation.email) {
    throw new Error("Signed-in email does not match the invitation");
  }

  const user = await getDocument(COLLECTIONS.USERS, userId);
  if (user?.role && user.role !== "renter") {
    throw new Error("This invite is for a renter account");
  }

  if (invitation.applicationId) {
    await updateDocument(COLLECTIONS.APPLICATIONS, invitation.applicationId, {
      renterId: userId,
      applicantEmail: normalized,
      applicantName: invitation.displayName || user?.displayName || "",
    });
  }

  if (invitation.allocationId) {
    await updateDocument(COLLECTIONS.ALLOCATIONS, invitation.allocationId, {
      tenantUserId: userId,
    });
  }

  await updateDocument(COLLECTIONS.RENTER_INVITATIONS, invitation.id, {
    status: "used",
    usedAt: serverTimestamp(),
    usedBy: userId,
  });

  await createAuditLog(userId, "renter.invite.claim", "renter_invitation", invitation.id);

  return invitation;
}

export async function claimStaffInvitation(token, userId, userEmail) {
  const invitation = await getStaffInvitationByToken(token);
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "pending") throw new Error("Invitation is no longer valid");

  const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await updateDocument(COLLECTIONS.STAFF_INVITATIONS, invitation.id, { status: "expired" });
    throw new Error("Invitation has expired");
  }

  const normalized = String(userEmail || "").trim().toLowerCase();
  if (normalized !== invitation.email) {
    throw new Error("Signed-in email does not match the invitation");
  }

  if (!STAFF_ROLES.includes(invitation.role)) {
    throw new Error("Invalid invitation role");
  }

  // claimInviteToken is read by Firestore rules to authorize the role change
  await updateDocument(COLLECTIONS.USERS, userId, {
    role: invitation.role,
    accountStatus: "active",
    claimInviteToken: token,
  });

  await createDocumentWithId(COLLECTIONS.STAFF_PROFILES, userId, {
    userId,
    role: invitation.role,
    displayTitle:
      invitation.role === "admin" ? "Platform Administrator" : "Property Manager",
    invitedBy: invitation.invitedBy,
    invitationId: invitation.id,
    activatedAt: serverTimestamp(),
  });

  await updateDocument(COLLECTIONS.STAFF_INVITATIONS, invitation.id, {
    status: "used",
    usedAt: serverTimestamp(),
    usedBy: userId,
  });

  // Clear one-time claim marker
  await updateDocument(COLLECTIONS.USERS, userId, {
    claimInviteToken: null,
  });

  await createAuditLog(userId, "staff.invite.claim", "staff_invitation", invitation.id, null, {
    role: invitation.role,
  });

  return invitation.role;
}

// ============================================================================
// Phase 2 — Owners (staff CRM), Rooms, Beds, Pricing, Migration
// ============================================================================

export async function createOwnerRecord(data, actorUserId = null) {
  const payload = {
    fullName: data.fullName || "",
    legalName: data.legalName || data.fullName || "",
    contactEmail: String(data.contactEmail || "").trim().toLowerCase(),
    phoneNumber: data.phoneNumber || "",
    address: data.address || "",
    preferredContactChannel: data.preferredContactChannel || "email",
    notes: data.notes || "",
    status: data.status || "active",
    linkedUserId: data.linkedUserId || null,
    createdBy: actorUserId,
  };
  const id = await createDocument(COLLECTIONS.OWNERS, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "owner.create", "owner", id);
  }
  return id;
}

export async function getAllOwners() {
  return queryDocuments(COLLECTIONS.OWNERS, [], { field: "createdAt", direction: "desc" }, 200);
}

export async function getOwnerRecord(ownerId) {
  return getDocument(COLLECTIONS.OWNERS, ownerId);
}

export async function updateOwnerRecord(ownerId, data, actorUserId = null) {
  await updateDocument(COLLECTIONS.OWNERS, ownerId, data);
  if (actorUserId) {
    await createAuditLog(actorUserId, "owner.update", "owner", ownerId);
  }
}

export async function createRoom(propertyId, data, actorUserId = null) {
  const property = await getDocument(COLLECTIONS.PROPERTIES, propertyId);
  if (!property) throw new Error("Property not found");

  const roomData = {
    propertyId,
    ownerId: property.ownerId || null,
    ownerRecordId: property.ownerRecordId || null,
    label: data.label || data.roomLabel || "",
    description: data.description || "",
    roomType: data.roomType || "private",
    capacity: Number(data.capacity) || 1,
    status: data.status || "active",
    photos: data.photos || [],
    legacyUnitId: data.legacyUnitId || null,
    notes: data.notes || "",
    createdBy: actorUserId,
  };

  const roomId = await createDocument(COLLECTIONS.ROOMS, roomData);
  await refreshPropertyInventoryCounts(propertyId);
  if (actorUserId) {
    await createAuditLog(actorUserId, "room.create", "room", roomId, null, { propertyId });
  }
  return roomId;
}

export async function getRoomsByProperty(propertyId) {
  return queryDocuments(
    COLLECTIONS.ROOMS,
    [{ field: "propertyId", operator: "==", value: propertyId }],
    { field: "label", direction: "asc" }
  );
}

export async function getAllRooms() {
  return queryDocuments(COLLECTIONS.ROOMS, [], { field: "createdAt", direction: "desc" }, 500);
}

export async function getRoomByLegacyUnitId(unitId) {
  const rows = await queryDocuments(COLLECTIONS.ROOMS, [
    { field: "legacyUnitId", operator: "==", value: unitId },
  ]);
  return rows[0] || null;
}

export async function createBed(roomId, data, actorUserId = null) {
  const room = await getDocument(COLLECTIONS.ROOMS, roomId);
  if (!room) throw new Error("Room not found");

  const bedData = {
    roomId,
    propertyId: room.propertyId,
    ownerId: room.ownerId || null,
    ownerRecordId: room.ownerRecordId || null,
    label: data.label || "Bed 1",
    status: data.status || "available",
    features: data.features || [],
    notes: data.notes || "",
    legacyUnitId: data.legacyUnitId || room.legacyUnitId || null,
    createdBy: actorUserId,
  };

  const bedId = await createDocument(COLLECTIONS.BEDS, bedData);
  await refreshPropertyInventoryCounts(room.propertyId);
  if (actorUserId) {
    await createAuditLog(actorUserId, "bed.create", "bed", bedId, null, { roomId });
  }
  return bedId;
}

export async function getBedsByRoom(roomId) {
  return queryDocuments(
    COLLECTIONS.BEDS,
    [{ field: "roomId", operator: "==", value: roomId }],
    { field: "label", direction: "asc" }
  );
}

export async function getBedsByProperty(propertyId) {
  return queryDocuments(
    COLLECTIONS.BEDS,
    [{ field: "propertyId", operator: "==", value: propertyId }],
    { field: "label", direction: "asc" }
  );
}

export async function updateBed(bedId, data, actorUserId = null) {
  const bed = await getDocument(COLLECTIONS.BEDS, bedId);
  if (!bed) throw new Error("Bed not found");
  await updateDocument(COLLECTIONS.BEDS, bedId, data);
  if (bed.propertyId) await refreshPropertyInventoryCounts(bed.propertyId);
  if (actorUserId) {
    await createAuditLog(actorUserId, "bed.update", "bed", bedId);
  }
}

export async function createRentalOffer(data, actorUserId = null) {
  const offer = {
    propertyId: data.propertyId,
    roomId: data.roomId || null,
    bedId: data.bedId || null,
    legacyUnitId: data.legacyUnitId || null,
    monthlyRent: Number(data.monthlyRent) || 0,
    currency: data.currency || "EUR",
    depositAmount: Number(data.depositAmount) || 0,
    depositMeaning: data.depositMeaning || "security_deposit", // security_deposit | advance_rent | other
    additionalCharges: data.additionalCharges || [],
    availableFrom: data.availableFrom || null,
    minimumStay: data.minimumStay || "",
    maximumStay: data.maximumStay || "",
    contractTemplateId: data.contractTemplateId || null,
    effectiveFrom: data.effectiveFrom || null,
    effectiveTo: data.effectiveTo || null,
    status: data.status || "active",
    createdBy: actorUserId,
  };
  const id = await createDocument(COLLECTIONS.RENTAL_OFFERS, offer);
  if (actorUserId) {
    await createAuditLog(actorUserId, "rental_offer.create", "rental_offer", id);
  }
  return id;
}

export async function getOffersForBed(bedId) {
  return queryDocuments(
    COLLECTIONS.RENTAL_OFFERS,
    [
      { field: "bedId", operator: "==", value: bedId },
      { field: "status", operator: "==", value: "active" },
    ],
    { field: "createdAt", direction: "desc" }
  );
}

export async function refreshPropertyInventoryCounts(propertyId) {
  const [rooms, beds] = await Promise.all([
    getRoomsByProperty(propertyId),
    getBedsByProperty(propertyId),
  ]);
  const availableBeds = beds.filter((b) => b.status === "available").length;
  await updateDocument(COLLECTIONS.PROPERTIES, propertyId, {
    totalRooms: rooms.length,
    totalBeds: beds.length,
    availableBeds,
  });
}

/**
 * Idempotent: maps one legacy unit → one room + N beds.
 * Skips if a room with legacyUnitId already exists.
 */
export async function migrateUnitToRoomAndBeds(unit, actorUserId = null) {
  if (!unit?.id) throw new Error("Unit required");

  const existing = await getRoomByLegacyUnitId(unit.id);
  if (existing) {
    return { skipped: true, roomId: existing.id, reason: "already_migrated" };
  }

  const occupancy = Math.max(
    1,
    Number(unit.occupancyLimit) || Number(unit.bedrooms) || 1
  );

  let roomType = "private";
  if (unit.unitType === "room" && occupancy > 1) roomType = "shared";
  else if (unit.unitType === "studio") roomType = "studio";
  else if (unit.unitType === "apartment" || unit.unitType === "house") roomType = "apartment";
  else if (unit.unitType === "room") roomType = "private";

  const needsManualReview =
    unit.unitType === "apartment" ||
    unit.unitType === "house" ||
    unit.unitType === "loft" ||
    unit.unitType === "penthouse";

  const roomId = await createRoom(
    unit.propertyId,
    {
      label: unit.unitName || "Room",
      description: unit.description || "",
      roomType,
      capacity: occupancy,
      status: unit.status === "maintenance" ? "active" : "active",
      legacyUnitId: unit.id,
      notes: needsManualReview
        ? "MANUAL_REVIEW: whole-unit style legacy record — confirm room/bed split"
        : "",
      photos: unit.images || [],
    },
    actorUserId
  );

  const bedIds = [];
  for (let i = 1; i <= occupancy; i++) {
    let bedStatus = "available";
    if (unit.status === "occupied") bedStatus = i === 1 ? "occupied" : "available";
    else if (unit.status === "reserved") bedStatus = i === 1 ? "reserved" : "available";
    else if (unit.status === "maintenance") bedStatus = "maintenance";

    const bedId = await createBed(
      roomId,
      {
        label: occupancy === 1 ? "Bed 1" : `Bed ${i}`,
        status: bedStatus,
        legacyUnitId: unit.id,
        notes: "",
      },
      actorUserId
    );
    bedIds.push(bedId);
  }

  // Primary bed gets pricing offer from unit rent
  if (bedIds[0] && (unit.rentAmount || unit.depositAmount)) {
    await createRentalOffer(
      {
        propertyId: unit.propertyId,
        roomId,
        bedId: bedIds[0],
        legacyUnitId: unit.id,
        monthlyRent: unit.rentAmount || 0,
        depositAmount: unit.depositAmount || 0,
        depositMeaning: "security_deposit",
        currency: unit.currency || "EUR",
        availableFrom: unit.availableFrom || null,
      },
      actorUserId
    );
  }

  // Mark unit as linked (do not delete)
  await updateDocument(COLLECTIONS.UNITS, unit.id, {
    inventoryMigrated: true,
    linkedRoomId: roomId,
    inventoryMigratedAt: serverTimestamp(),
  });

  return {
    skipped: false,
    roomId,
    bedIds,
    needsManualReview,
  };
}

export async function migrateAllUnitsForProperty(propertyId, actorUserId = null) {
  const units = await getUnitsByProperty(propertyId);
  const results = [];
  for (const unit of units) {
    results.push(await migrateUnitToRoomAndBeds(unit, actorUserId));
  }
  return results;
}

export async function getPropertyInventory(propertyId) {
  const [property, rooms, beds, units] = await Promise.all([
    getDocument(COLLECTIONS.PROPERTIES, propertyId),
    getRoomsByProperty(propertyId),
    getBedsByProperty(propertyId),
    getUnitsByProperty(propertyId),
  ]);

  const roomsWithBeds = rooms.map((room) => ({
    ...room,
    beds: beds.filter((b) => b.roomId === room.id),
  }));

  return { property, rooms: roomsWithBeds, beds, units };
}

// ============================================================================
// Phase 3 — Applications pipeline + transaction-safe bed allocation
// ============================================================================

/**
 * Staff/walk-in application (no listing required). Links to property/room when known.
 */
export async function createStaffApplication(data, actorUserId) {
  const propertyId = data.propertyId || null;
  let ownerId = data.ownerId || null;
  let ownerRecordId = data.ownerRecordId || null;
  let propertyName = data.propertyName || "";

  if (propertyId) {
    const property = await getDocument(COLLECTIONS.PROPERTIES, propertyId);
    if (!property) throw new Error("Property not found");
    ownerId = property.ownerId || ownerId;
    ownerRecordId = property.ownerRecordId || ownerRecordId;
    propertyName = property.name || propertyName;
  }

  // Soft dedupe: same email + property with open status
  if (data.applicantEmail && propertyId) {
    const existing = await queryDocuments(COLLECTIONS.APPLICATIONS, [
      { field: "applicantEmail", operator: "==", value: String(data.applicantEmail).trim().toLowerCase() },
      { field: "propertyId", operator: "==", value: propertyId },
    ]);
    const open = existing.find(
      (a) => !["withdrawn", "rejected", "expired", "closed", "allocated"].includes(a.status)
    );
    if (open) {
      throw new Error("An open application already exists for this email on this property");
    }
  }

  const payload = {
    renterId: data.renterId || null,
    listingId: data.listingId || null,
    ownerId,
    ownerRecordId,
    propertyId,
    roomId: data.roomId || null,
    bedId: data.bedId || null,
    requestedRoomType: data.requestedRoomType || "",
    listingTitle: propertyName || data.listingTitle || "Property enquiry",
    applicantName: data.applicantName || "",
    applicantEmail: String(data.applicantEmail || "").trim().toLowerCase(),
    applicantPhone: data.applicantPhone || "",
    desiredMoveIn: data.desiredMoveIn || null,
    intendedDuration: data.intendedDuration || "",
    message: data.message || "",
    occupation: data.occupation || "",
    monthlyIncome: data.monthlyIncome || null,
    numberOfOccupants: Number(data.numberOfOccupants) || 1,
    hasPets: data.hasPets || false,
    petDetails: data.petDetails || "",
    internalNotes: data.internalNotes || "",
    assignedManagerId: actorUserId || null,
    status: "new",
    submittedAt: serverTimestamp(),
    decidedAt: null,
    decisionNote: "",
    allocationId: null,
    source: data.source || "staff",
    createdBy: actorUserId,
  };

  const appId = await createDocument(COLLECTIONS.APPLICATIONS, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "application.create", "application", appId, null, {
      propertyId,
    });
  }
  return appId;
}

/**
 * Atomically allocate a bed to an approved application.
 * Uses the bed document as the lock: concurrent allocators collide on bed write.
 */
export async function allocateBedAtomically(
  {
    applicationId,
    bedId,
    startDate,
    plannedEndDate = null,
    agreedMonthlyRent,
    agreedDeposit = 0,
    currency = "EUR",
  },
  actorUserId
) {
  if (!applicationId || !bedId || !startDate) {
    throw new Error("Application, bed, and start date are required");
  }

  const allocationRef = doc(collection(db, COLLECTIONS.ALLOCATIONS));
  const allocationId = allocationRef.id;
  let propertyIdForCounts = null;

  await runTransaction(db, async (tx) => {
    const bedRef = doc(db, COLLECTIONS.BEDS, bedId);
    const appRef = doc(db, COLLECTIONS.APPLICATIONS, applicationId);

    const [bedSnap, appSnap] = await Promise.all([tx.get(bedRef), tx.get(appRef)]);

    if (!bedSnap.exists()) throw new Error("Bed not found");
    if (!appSnap.exists()) throw new Error("Application not found");

    const bed = bedSnap.data();
    const app = appSnap.data();
    propertyIdForCounts = bed.propertyId;

    if (bed.status !== "available") {
      throw new Error(`This bed is not available (currently: ${bed.status})`);
    }
    if (bed.currentAllocationId) {
      throw new Error("This bed is already allocated — choose another bed");
    }

    if (["allocated", "rejected", "withdrawn", "closed", "expired"].includes(app.status)) {
      throw new Error(`Application cannot be allocated (status: ${app.status})`);
    }
    if (!["approved", "accepted"].includes(app.status)) {
      throw new Error("Approve the application before allocating a bed");
    }
    if (app.allocationId) {
      throw new Error("This application already has an allocation");
    }

    tx.set(allocationRef, {
      applicationId,
      tenantUserId: app.renterId || null,
      applicantName: app.applicantName || "",
      applicantEmail: app.applicantEmail || "",
      propertyId: bed.propertyId,
      roomId: bed.roomId,
      bedId,
      startDate,
      plannedEndDate: plannedEndDate || null,
      actualEndDate: null,
      agreedMonthlyRent: Number(agreedMonthlyRent) || 0,
      agreedDeposit: Number(agreedDeposit) || 0,
      currency: currency || "EUR",
      status: "reserved",
      createdBy: actorUserId || null,
      approvedBy: actorUserId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    tx.update(bedRef, {
      status: "reserved",
      currentAllocationId: allocationId,
      updatedAt: serverTimestamp(),
    });

    tx.update(appRef, {
      status: "allocated",
      allocationId,
      propertyId: bed.propertyId,
      roomId: bed.roomId,
      bedId,
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  if (propertyIdForCounts) {
    await refreshPropertyInventoryCounts(propertyIdForCounts);
  }

  if (actorUserId) {
    await createAuditLog(actorUserId, "allocation.create", "allocation", allocationId, null, {
      applicationId,
      bedId,
    });
  }

  const app = await getDocument(COLLECTIONS.APPLICATIONS, applicationId);
  if (app?.renterId) {
    await createNotification(app.renterId, "allocation_confirmed", {
      title: "Room allocated",
      message: "A room/bed has been reserved for you. Contract steps come next.",
      link: "/my-home/applications",
      entityType: "allocation",
      entityId: allocationId,
    });
  }

  return allocationId;
}

export async function getAllAllocations(status = null) {
  const conditions = status ? [{ field: "status", operator: "==", value: status }] : [];
  return queryDocuments(
    COLLECTIONS.ALLOCATIONS,
    conditions,
    { field: "createdAt", direction: "desc" },
    200
  );
}

export async function getAllocationsByProperty(propertyId) {
  return queryDocuments(
    COLLECTIONS.ALLOCATIONS,
    [{ field: "propertyId", operator: "==", value: propertyId }],
    { field: "createdAt", direction: "desc" }
  );
}

/** Active / reserved allocations for a signed-in renter (mediation model). */
export async function getAllocationsByTenant(tenantUserId) {
  if (!tenantUserId) return [];
  return queryDocuments(
    COLLECTIONS.ALLOCATIONS,
    [{ field: "tenantUserId", operator: "==", value: tenantUserId }],
    { field: "createdAt", direction: "desc" },
    20
  );
}

/**
 * Housing summary for renter dashboards: current allocation + property/room/bed + rent charges.
 */
export async function getRenterHousingSummary(tenantUserId, tenantEmail = null) {
  if (!tenantUserId && !tenantEmail) return null;

  let allocations = tenantUserId ? await getAllocationsByTenant(tenantUserId) : [];

  // Fallback: older rows may only have applicantEmail until login invite links tenantUserId
  if (!allocations.length && tenantEmail) {
    const byEmail = await queryDocuments(
      COLLECTIONS.ALLOCATIONS,
      [{ field: "applicantEmail", operator: "==", value: String(tenantEmail).trim().toLowerCase() }],
      { field: "createdAt", direction: "desc" },
      10
    );
    allocations = byEmail;
    // Self-heal link for next load
    const linkable = byEmail.find(
      (a) =>
        tenantUserId &&
        !a.tenantUserId &&
        ["reserved", "active", "pending"].includes(a.status)
    );
    if (linkable) {
      try {
        await updateDocument(COLLECTIONS.ALLOCATIONS, linkable.id, {
          tenantUserId,
        });
        linkable.tenantUserId = tenantUserId;
      } catch {
        /* rules may block; still show via email match */
      }
    }
  }

  const live = allocations.find((a) =>
    ["reserved", "active", "pending"].includes(a.status)
  );
  if (!live) return null;

  const safeGet = async (collectionName, id) => {
    if (!id) return null;
    try {
      return await getDocument(collectionName, id);
    } catch {
      return null;
    }
  };

  const [property, room, bed, chargesByTenant, chargesByAlloc] = await Promise.all([
    safeGet(COLLECTIONS.PROPERTIES, live.propertyId),
    safeGet(COLLECTIONS.ROOMS, live.roomId),
    safeGet(COLLECTIONS.BEDS, live.bedId),
    tenantUserId
      ? queryDocuments(
          COLLECTIONS.RENT_CHARGES,
          [{ field: "tenantUserId", operator: "==", value: tenantUserId }],
          { field: "dueDate", direction: "desc" },
          24
        ).catch(() => [])
      : Promise.resolve([]),
    queryDocuments(
      COLLECTIONS.RENT_CHARGES,
      [{ field: "allocationId", operator: "==", value: live.id }],
      { field: "dueDate", direction: "desc" },
      24
    ).catch(() => []),
  ]);

  const byId = new Map();
  [...(chargesByAlloc || []), ...(chargesByTenant || [])].forEach((c) => {
    byId.set(c.id, c);
  });
  const charges = Array.from(byId.values());

  return { allocation: live, property, room, bed, charges };
}

export async function getAvailableBedsForProperty(propertyId) {
  const beds = await getBedsByProperty(propertyId);
  return beds.filter((b) => b.status === "available" && !b.currentAllocationId);
}

/**
 * Cancel a reserved allocation and free the bed (history preserved on allocation doc).
 */
export async function cancelAllocation(allocationId, actorUserId = null) {
  const allocation = await getDocument(COLLECTIONS.ALLOCATIONS, allocationId);
  if (!allocation) throw new Error("Allocation not found");
  if (allocation.status === "ended" || allocation.status === "cancelled") {
    throw new Error("Allocation is already closed");
  }

  const bedRef = doc(db, COLLECTIONS.BEDS, allocation.bedId);

  await runTransaction(db, async (tx) => {
    const bedSnap = await tx.get(bedRef);
    const allocRef = doc(db, COLLECTIONS.ALLOCATIONS, allocationId);

    tx.update(allocRef, {
      status: "cancelled",
      actualEndDate: new Date().toISOString().slice(0, 10),
      updatedAt: serverTimestamp(),
      cancelledBy: actorUserId || null,
    });

    if (bedSnap.exists()) {
      const bed = bedSnap.data();
      if (bed.currentAllocationId === allocationId) {
        tx.update(bedRef, {
          status: "available",
          currentAllocationId: null,
          updatedAt: serverTimestamp(),
        });
      }
    }
  });

  if (allocation.propertyId) {
    await refreshPropertyInventoryCounts(allocation.propertyId);
  }
  if (actorUserId) {
    await createAuditLog(actorUserId, "allocation.cancel", "allocation", allocationId);
  }
}

// ============================================================================
// Phase 4 — Contract templates, drafts, approval, renewals
// ============================================================================

const PLACEHOLDER_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function extractPlaceholders(body = "") {
  const keys = new Set();
  let m;
  const re = new RegExp(PLACEHOLDER_RE.source, "gi");
  while ((m = re.exec(body))) keys.add(m[1]);
  return [...keys];
}

/**
 * Fill {{placeholders}}. Required missing keys block generation.
 */
export function renderContractTemplate(body, fields = {}, options = {}) {
  const requiredKeys = new Set(
    (options.requiredKeys ||
      CONTRACT_PLACEHOLDERS.filter((p) => p.required).map((p) => p.key))
  );
  const used = extractPlaceholders(body);
  const missing = [];
  const filled = {};

  for (const key of used) {
    const raw = fields[key];
    const value =
      raw === null || raw === undefined || String(raw).trim() === ""
        ? ""
        : String(raw).trim();
    filled[key] = value;
    if (!value && (requiredKeys.has(key) || options.requireAllUsed)) {
      missing.push(key);
    }
  }

  // Also flag required catalog keys that appear in template and are empty
  for (const key of requiredKeys) {
    if (used.includes(key) && !filled[key] && !missing.includes(key)) {
      missing.push(key);
    }
  }

  if (missing.length) {
    return {
      ok: false,
      missing,
      filled,
      body: null,
      html: null,
    };
  }

  const rendered = body.replace(PLACEHOLDER_RE, (_, key) => filled[key] ?? "");
  const html = rendered
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");

  return { ok: true, missing: [], filled, body: rendered, html };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeContractReference() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RR-${y}${m}-${rand}`;
}

export async function createContractTemplate(data, actorUserId) {
  const body = data.body || DEFAULT_CONTRACT_TEMPLATE_BODY;
  const payload = {
    name: data.name || "Standard rental agreement",
    category: data.category || "rental_agreement",
    ownerRecordId: data.ownerRecordId || null,
    propertyId: data.propertyId || null,
    body,
    placeholders: extractPlaceholders(body),
    version: 1,
    status: "active",
    notes: data.notes || "",
    createdBy: actorUserId,
    updatedBy: actorUserId,
  };
  const id = await createDocument(COLLECTIONS.CONTRACT_TEMPLATES, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "contract_template.create", "contract_template", id);
  }
  return id;
}

export async function createContractTemplateVersion(templateId, data, actorUserId) {
  const prev = await getDocument(COLLECTIONS.CONTRACT_TEMPLATES, templateId);
  if (!prev) throw new Error("Template not found");

  // Supersede previous active version in same family
  await updateDocument(COLLECTIONS.CONTRACT_TEMPLATES, templateId, {
    status: "superseded",
    updatedBy: actorUserId,
  });

  const body = data.body ?? prev.body;
  const payload = {
    name: data.name || prev.name,
    category: data.category || prev.category || "other",
    ownerRecordId: data.ownerRecordId ?? prev.ownerRecordId,
    propertyId: data.propertyId ?? prev.propertyId,
    body,
    placeholders: extractPlaceholders(body),
    version: (Number(prev.version) || 1) + 1,
    status: "active",
    notes: data.notes ?? prev.notes ?? "",
    previousTemplateId: templateId,
    rootTemplateId: prev.rootTemplateId || templateId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  };
  const id = await createDocument(COLLECTIONS.CONTRACT_TEMPLATES, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "contract_template.version", "contract_template", id, null, {
      previousTemplateId: templateId,
    });
  }
  return id;
}

export async function getActiveContractTemplates() {
  return queryDocuments(
    COLLECTIONS.CONTRACT_TEMPLATES,
    [{ field: "status", operator: "==", value: "active" }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function getAllContractTemplates() {
  return queryDocuments(COLLECTIONS.CONTRACT_TEMPLATES, [], {
    field: "createdAt",
    direction: "desc",
  });
}

/**
 * Build verified field map from allocation + related records.
 */
export async function buildContractFieldsFromAllocation(allocationId, overrides = {}) {
  const allocation = await getDocument(COLLECTIONS.ALLOCATIONS, allocationId);
  if (!allocation) throw new Error("Allocation not found");

  const [property, room, bed, application] = await Promise.all([
    allocation.propertyId ? getDocument(COLLECTIONS.PROPERTIES, allocation.propertyId) : null,
    allocation.roomId ? getDocument(COLLECTIONS.ROOMS, allocation.roomId) : null,
    allocation.bedId ? getDocument(COLLECTIONS.BEDS, allocation.bedId) : null,
    allocation.applicationId
      ? getDocument(COLLECTIONS.APPLICATIONS, allocation.applicationId)
      : null,
  ]);

  let ownerRecord = null;
  const ownerRecordId = property?.ownerRecordId || allocation.ownerRecordId;
  if (ownerRecordId) {
    ownerRecord = await getDocument(COLLECTIONS.OWNERS, ownerRecordId);
  }

  const addressParts = [
    property?.address,
    property?.postalCode,
    property?.city,
    property?.country,
  ].filter(Boolean);

  const fields = {
    owner_legal_name: ownerRecord?.legalName || ownerRecord?.fullName || "",
    tenant_full_name:
      allocation.applicantName ||
      application?.applicantName ||
      "",
    tenant_email: application?.applicantEmail || allocation.applicantEmail || "",
    tenant_phone: application?.applicantPhone || allocation.applicantPhone || "",
    property_name: property?.name || "",
    property_address: addressParts.join(", "),
    property_city: property?.city || "",
    property_postal_code: property?.postalCode || "",
    room_label: room?.label || "",
    bed_label: bed?.label || "",
    contract_start_date: allocation.startDate || application?.desiredMoveIn || "",
    contract_end_date: allocation.plannedEndDate || overrides.contract_end_date || "",
    document_date: new Date().toISOString().slice(0, 10),
    monthly_rent:
      allocation.agreedMonthlyRent != null ? String(allocation.agreedMonthlyRent) : "",
    security_deposit:
      allocation.agreedDeposit != null ? String(allocation.agreedDeposit) : "",
    number_of_occupants:
      application?.numberOfOccupants != null ? String(application.numberOfOccupants) : "",
    currency: allocation.currency || "EUR",
    contract_reference: overrides.contract_reference || makeContractReference(),
    ...overrides,
  };

  return {
    fields,
    context: {
      allocation,
      property,
      room,
      bed,
      application,
      ownerRecord,
      tenantUserId: allocation.tenantUserId || application?.renterId || null,
      ownerRecordId: ownerRecordId || null,
      propertyId: allocation.propertyId || null,
    },
  };
}

/**
 * Generate a draft contract. Throws if required placeholders cannot be filled.
 */
export async function generateContractDraft(
  { allocationId, templateId, fieldOverrides = {}, renewalOfContractId = null },
  actorUserId
) {
  const template = await getDocument(COLLECTIONS.CONTRACT_TEMPLATES, templateId);
  if (!template || template.status !== "active") {
    throw new Error("Active contract template required");
  }

  const { fields, context } = await buildContractFieldsFromAllocation(
    allocationId,
    fieldOverrides
  );

  const rendered = renderContractTemplate(template.body, fields);
  if (!rendered.ok) {
    const err = new Error(
      `Cannot generate contract — missing required fields: ${rendered.missing.join(", ")}`
    );
    err.missing = rendered.missing;
    err.filled = rendered.filled;
    throw err;
  }

  // Version: if renewing, bump from prior; else 1
  let version = 1;
  let supersedesContractId = null;
  if (renewalOfContractId) {
    const prior = await getDocument(COLLECTIONS.CONTRACTS, renewalOfContractId);
    if (!prior) throw new Error("Prior contract not found for renewal");
    version = (Number(prior.version) || 1) + 1;
    supersedesContractId = renewalOfContractId;
  }

  const payload = {
    tenantUserId: context.tenantUserId,
    applicantName: fields.tenant_full_name,
    applicantEmail: context.application?.applicantEmail || context.allocation.applicantEmail || "",
    ownerRecordId: context.ownerRecordId,
    propertyId: context.propertyId,
    allocationId,
    applicationId: context.allocation.applicationId || null,
    templateId,
    templateVersion: template.version || 1,
    contractReference: fields.contract_reference,
    version,
    startDate: fields.contract_start_date,
    endDate: fields.contract_end_date || null,
    monthlyRent: Number(fields.monthly_rent) || 0,
    depositAmount: Number(fields.security_deposit) || 0,
    currency: fields.currency || "EUR",
    status: "draft",
    body: rendered.body,
    bodyHtml: rendered.html,
    fieldValues: rendered.filled,
    generatedBy: actorUserId,
    approvedBy: null,
    approvedAt: null,
    issuedAt: null,
    supersedesContractId,
    renewalRequestId: fieldOverrides.renewalRequestId || null,
    // Private storage: body kept in Firestore (not a public URL)
    storage: { type: "firestore", note: "Private document body; not publicly linkable" },
  };

  const id = await createDocument(COLLECTIONS.CONTRACTS, payload);

  if (actorUserId) {
    await createAuditLog(actorUserId, "contract.draft", "contract", id, null, {
      allocationId,
      templateId,
      missing: [],
    });
  }

  return { id, missing: [], contractReference: fields.contract_reference, preview: rendered };
}

/** Preview without writing — same validation rules */
export async function previewContractDraft({ allocationId, templateId, fieldOverrides = {} }) {
  const template = await getDocument(COLLECTIONS.CONTRACT_TEMPLATES, templateId);
  if (!template) throw new Error("Template not found");
  const { fields } = await buildContractFieldsFromAllocation(allocationId, fieldOverrides);
  return { fields, ...renderContractTemplate(template.body, fields) };
}

export async function approveContract(contractId, actorUserId) {
  const contract = await getDocument(COLLECTIONS.CONTRACTS, contractId);
  if (!contract) throw new Error("Contract not found");
  if (contract.status !== "draft") {
    throw new Error(`Only drafts can be approved (status: ${contract.status})`);
  }

  await updateDocument(COLLECTIONS.CONTRACTS, contractId, {
    status: "approved",
    approvedBy: actorUserId,
    approvedAt: serverTimestamp(),
  });

  if (contract.supersedesContractId) {
    await updateDocument(COLLECTIONS.CONTRACTS, contract.supersedesContractId, {
      status: "superseded",
    });
  }

  if (actorUserId) {
    await createAuditLog(actorUserId, "contract.approve", "contract", contractId);
  }

  if (contract.tenantUserId) {
    await createNotification(contract.tenantUserId, "contract_approved", {
      title: "Contract approved",
      message: `Contract ${contract.contractReference} is available in your documents.`,
      link: "/my-home/documents",
      entityType: "contract",
      entityId: contractId,
    });
  }

  return contractId;
}

export async function issueContract(contractId, actorUserId) {
  const contract = await getDocument(COLLECTIONS.CONTRACTS, contractId);
  if (!contract) throw new Error("Contract not found");
  if (!["approved", "issued"].includes(contract.status)) {
    throw new Error("Approve the contract before issuing to the tenant");
  }
  await updateDocument(COLLECTIONS.CONTRACTS, contractId, {
    status: "issued",
    issuedAt: serverTimestamp(),
    issuedBy: actorUserId,
  });
  if (actorUserId) {
    await createAuditLog(actorUserId, "contract.issue", "contract", contractId);
  }
  if (contract.tenantUserId) {
    await createNotification(contract.tenantUserId, "contract_issued", {
      title: "Contract issued",
      message: `Please review contract ${contract.contractReference}.`,
      link: "/my-home/documents",
      entityType: "contract",
      entityId: contractId,
    });
  }
}

export async function voidContract(contractId, reason, actorUserId) {
  const contract = await getDocument(COLLECTIONS.CONTRACTS, contractId);
  if (!contract) throw new Error("Contract not found");
  if (["signed", "void"].includes(contract.status)) {
    throw new Error(`Cannot void a ${contract.status} contract here`);
  }
  await updateDocument(COLLECTIONS.CONTRACTS, contractId, {
    status: "void",
    voidReason: reason || "",
    voidedBy: actorUserId,
    voidedAt: serverTimestamp(),
  });
  if (actorUserId) {
    await createAuditLog(actorUserId, "contract.void", "contract", contractId, reason);
  }
}

export async function getAllContracts(status = null) {
  const conditions = status ? [{ field: "status", operator: "==", value: status }] : [];
  return queryDocuments(
    COLLECTIONS.CONTRACTS,
    conditions,
    { field: "createdAt", direction: "desc" },
    200
  );
}

export async function getContractsForTenant(tenantUserId) {
  return queryDocuments(
    COLLECTIONS.CONTRACTS,
    [{ field: "tenantUserId", operator: "==", value: tenantUserId }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function getContractsVisibleToApplicant(email) {
  if (!email) return [];
  return queryDocuments(
    COLLECTIONS.CONTRACTS,
    [{ field: "applicantEmail", operator: "==", value: String(email).trim().toLowerCase() }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function createRenewalRequest(data, tenantUserId) {
  const payload = {
    tenantUserId,
    contractId: data.contractId || null,
    allocationId: data.allocationId || null,
    propertyId: data.propertyId || null,
    requestedStartDate: data.requestedStartDate || null,
    requestedEndDate: data.requestedEndDate || null,
    message: data.message || "",
    status: "submitted",
    managerNotes: "",
  };
  const id = await createDocument(COLLECTIONS.RENEWAL_REQUESTS, payload);
  await createAuditLog(tenantUserId, "renewal.request", "renewal_request", id);
  return id;
}

export async function getAllRenewalRequests() {
  return queryDocuments(COLLECTIONS.RENEWAL_REQUESTS, [], {
    field: "createdAt",
    direction: "desc",
  });
}

export async function getRenewalRequestsForTenant(tenantUserId) {
  return queryDocuments(
    COLLECTIONS.RENEWAL_REQUESTS,
    [{ field: "tenantUserId", operator: "==", value: tenantUserId }],
    { field: "createdAt", direction: "desc" }
  );
}

export async function updateRenewalRequestStatus(requestId, status, notes, actorUserId) {
  await updateDocument(COLLECTIONS.RENEWAL_REQUESTS, requestId, {
    status,
    managerNotes: notes || "",
    reviewedBy: actorUserId,
    reviewedAt: serverTimestamp(),
  });
  if (actorUserId) {
    await createAuditLog(actorUserId, "renewal.status", "renewal_request", requestId, null, {
      status,
    });
  }
}

/**
 * Create a renewal draft from an existing contract + allocation. Never overwrites prior contract.
 */
export async function generateRenewalDraft(
  { priorContractId, templateId, allocationId, fieldOverrides = {}, renewalRequestId = null },
  actorUserId
) {
  const prior = await getDocument(COLLECTIONS.CONTRACTS, priorContractId);
  if (!prior) throw new Error("Prior contract not found");
  if (["void"].includes(prior.status)) {
    throw new Error("Cannot renew a void contract");
  }

  const result = await generateContractDraft(
    {
      allocationId: allocationId || prior.allocationId,
      templateId: templateId || prior.templateId,
      fieldOverrides: {
        ...fieldOverrides,
        renewalRequestId,
      },
      renewalOfContractId: priorContractId,
    },
    actorUserId
  );

  if (renewalRequestId) {
    await updateRenewalRequestStatus(renewalRequestId, "fulfilled", "Draft generated", actorUserId);
  }

  return result;
}

// ============================================================================
// Phase 7 — WhatsApp adapter integration (sandbox + webhook simulation)
// ============================================================================

const WHATSAPP_SETTINGS_DOC = "whatsapp";

export async function getWhatsAppSettings() {
  const docData = await getDocument(COLLECTIONS.PLATFORM_SETTINGS, WHATSAPP_SETTINGS_DOC);
  return (
    docData || {
      mode: WHATSAPP_MODES.SANDBOX,
      productionApproved: false,
      testNumberConfigured: false,
      coexistenceReviewed: false,
      webhookVerifyConfigured: false,
      templatesApprovedInMeta: false,
      notes: "",
      checklist: {},
    }
  );
}

export async function updateWhatsAppSettings(partial, actorUserId) {
  const current = await getWhatsAppSettings();
  // Never accept access tokens from the client
  const safe = { ...partial };
  delete safe.accessToken;
  delete safe.appSecret;
  delete safe.webhookVerifyToken;

  const next = {
    ...current,
    ...safe,
    updatedAt: serverTimestamp(),
    updatedBy: actorUserId,
  };

  // Hard gate: live mode requires explicit productionApproved
  if (next.mode === WHATSAPP_MODES.LIVE && !next.productionApproved) {
    throw new Error(
      "Live WhatsApp mode blocked — productionApproved must be set after checklist + written approval"
    );
  }

  await setDoc(doc(db, COLLECTIONS.PLATFORM_SETTINGS, WHATSAPP_SETTINGS_DOC), next, {
    merge: true,
  });
  if (actorUserId) {
    await createAuditLog(actorUserId, "whatsapp.settings", "platform_settings", WHATSAPP_SETTINGS_DOC, null, {
      mode: next.mode,
      productionApproved: next.productionApproved,
    });
  }
  return next;
}

export async function createWhatsAppTemplate(data, actorUserId) {
  const payload = {
    name: data.name || "",
    language: data.language || "en",
    category: data.category || "utility",
    body: data.body || "",
    metaStatus: data.metaStatus || "draft_local", // draft_local | pending_meta | approved | rejected
    variables: data.variables || [],
    notes: data.notes || "",
    createdBy: actorUserId,
  };
  if (!payload.name || !payload.body) throw new Error("Template name and body required");
  const id = await createDocument(COLLECTIONS.WHATSAPP_TEMPLATES, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "whatsapp.template.create", "whatsapp_template", id);
  }
  return id;
}

export async function getWhatsAppTemplates() {
  return queryDocuments(COLLECTIONS.WHATSAPP_TEMPLATES, [], {
    field: "createdAt",
    direction: "desc",
  });
}

/**
 * Send WhatsApp via adapter. Browser always uses sandbox provider.
 * Live/test Meta calls require Cloud Functions (see docs/PHASE7_WHATSAPP.md).
 */
export async function sendWhatsAppMessage(request, actorUserId) {
  const settings = await getWhatsAppSettings();
  if (settings.mode === WHATSAPP_MODES.LIVE && !settings.productionApproved) {
    throw new Error("Live WhatsApp blocked until production approval");
  }

  const provider = createSandboxWhatsAppProvider();
  const result = await provider.send(request);

  const logId = await createDocument(COLLECTIONS.MESSAGE_DELIVERY_LOGS, {
    channel: "whatsapp",
    mode: result.mode || WHATSAPP_MODES.SANDBOX,
    to: normalizeE164(request.toE164),
    subject: request.type === "template" ? `template:${request.templateName}` : "text",
    template: request.templateName || "text",
    payloadSummary: {
      type: request.type,
      conversationId: request.conversationId || null,
      // Do not store full message body in logs
      hasText: Boolean(request.text),
    },
    status: result.status,
    attempts: 1,
    maxAttempts: 5,
    idempotencyKey:
      request.idempotencyKey ||
      `wa:${normalizeE164(request.toE164)}:${request.templateName || "text"}:${Date.now()}`,
    relatedConversationId: request.conversationId || null,
    providerMessageId: result.providerMessageId || null,
    lastError: result.error || null,
    createdBy: actorUserId,
  });

  if (actorUserId) {
    await createAuditLog(actorUserId, "whatsapp.send", "message_delivery_log", logId, null, {
      status: result.status,
      mode: result.mode,
    });
  }

  // Optionally mirror into inbox conversation
  if (request.conversationId && result.ok) {
    await createDocument(COLLECTIONS.MESSAGES, {
      conversationId: request.conversationId,
      senderId: actorUserId,
      senderType: "staff",
      channel: "whatsapp",
      body:
        request.type === "template"
          ? `[WhatsApp template: ${request.templateName}]`
          : String(request.text || "").slice(0, 500),
      deliveryStatus: result.status,
      providerMessageId: result.providerMessageId || null,
      readBy: actorUserId ? [actorUserId] : [],
    });
    await updateDocument(COLLECTIONS.CONVERSATIONS, request.conversationId, {
      channel: "whatsapp",
      lastMessage: request.type === "template" ? `WA template ${request.templateName}` : request.text,
      lastMessageAt: serverTimestamp(),
      lastSenderId: actorUserId,
      lastSenderType: "staff",
      handoverState: "human",
    });
  }

  return { ...result, logId };
}

/**
 * Ingest a Meta-style webhook payload (simulated from manager UI or future Cloud Function).
 * Verifies structure lightly; signature verification for live traffic belongs on the server.
 */
export async function ingestWhatsAppWebhook(payload, { actorUserId = null, simulated = true } = {}) {
  const eventId = await createDocument(COLLECTIONS.WHATSAPP_WEBHOOK_EVENTS, {
    payloadType: payload?.object || "unknown",
    simulated: Boolean(simulated),
    // Store metadata only — avoid dumping full PII bodies when possible
    entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
    rawSummary: summarizeWhatsAppWebhook(payload),
    processed: false,
    receivedBy: actorUserId,
  });

  const inbound = extractInboundWhatsAppMessages(payload);
  const created = [];

  for (const msg of inbound) {
    const phone = normalizeE164(msg.from);
    let conversationId = null;

    // Find open WA thread by guest phone
    const existing = await queryDocuments(COLLECTIONS.CONVERSATIONS, [
      { field: "channel", operator: "==", value: "whatsapp" },
      { field: "guestPhone", operator: "==", value: phone },
    ]);
    const open = existing.find((c) => c.status !== "resolved");
    if (open) {
      conversationId = open.id;
    } else {
      conversationId = await createDocument(COLLECTIONS.CONVERSATIONS, {
        participantIds: actorUserId ? [actorUserId] : [],
        channel: "whatsapp",
        status: "open",
        handoverState: "human",
        assignedManagerId: actorUserId || null,
        guestName: phone,
        guestEmail: "",
        guestPhone: phone,
        propertyId: null,
        topic: "whatsapp_inbound",
        contextType: "whatsapp",
        contextId: `wa:${phone}`,
        lastMessage: msg.text || `[${msg.type}]`,
        lastMessageAt: serverTimestamp(),
        lastSenderType: "guest",
        unreadForStaff: true,
        internalNotes: "",
      });
    }

    await createDocument(COLLECTIONS.MESSAGES, {
      conversationId,
      senderId: null,
      senderType: "guest",
      channel: "whatsapp",
      body: msg.text || `[${msg.type} message]`,
      providerMessageId: msg.id || null,
      deliveryStatus: "received",
      readBy: [],
      webhookEventId: eventId,
    });

    await updateDocument(COLLECTIONS.CONVERSATIONS, conversationId, {
      lastMessage: msg.text || `[${msg.type}]`,
      lastMessageAt: serverTimestamp(),
      lastSenderType: "guest",
      unreadForStaff: true,
      status: "open",
    });

    created.push({ conversationId, messageId: msg.id });
  }

  // Status updates (delivered/read/failed)
  const statuses = extractWhatsAppStatuses(payload);
  for (const st of statuses) {
    await createDocument(COLLECTIONS.MESSAGE_DELIVERY_LOGS, {
      channel: "whatsapp",
      mode: simulated ? WHATSAPP_MODES.SANDBOX : WHATSAPP_MODES.TEST,
      to: normalizeE164(st.recipient_id || ""),
      subject: `status:${st.status}`,
      template: "status_webhook",
      status: st.status || "unknown",
      attempts: 1,
      maxAttempts: 1,
      idempotencyKey: `wa-status:${st.id || Date.now()}:${st.status}`,
      providerMessageId: st.id || null,
      payloadSummary: { status: st.status, timestamp: st.timestamp },
      createdBy: actorUserId,
    });
  }

  await updateDocument(COLLECTIONS.WHATSAPP_WEBHOOK_EVENTS, eventId, {
    processed: true,
    inboundCount: inbound.length,
    statusCount: statuses.length,
  });

  if (actorUserId) {
    await createAuditLog(actorUserId, "whatsapp.webhook.ingest", "whatsapp_webhook_event", eventId, null, {
      simulated,
      inbound: inbound.length,
      statuses: statuses.length,
    });
  }

  return { eventId, inbound: created, statuses: statuses.length };
}

function summarizeWhatsAppWebhook(payload) {
  try {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    return {
      field: changes?.field || null,
      hasMessages: Boolean(changes?.value?.messages?.length),
      hasStatuses: Boolean(changes?.value?.statuses?.length),
    };
  } catch {
    return {};
  }
}

function extractInboundWhatsAppMessages(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const m of change.value?.messages || []) {
        out.push({
          id: m.id,
          from: m.from,
          type: m.type,
          text: m.text?.body || m.button?.text || "",
          timestamp: m.timestamp,
        });
      }
    }
  }
  return out;
}

function extractWhatsAppStatuses(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const s of change.value?.statuses || []) {
        out.push(s);
      }
    }
  }
  return out;
}

export async function getWhatsAppWebhookEvents(limitCount = 30) {
  return queryDocuments(
    COLLECTIONS.WHATSAPP_WEBHOOK_EVENTS,
    [],
    { field: "createdAt", direction: "desc" },
    limitCount
  );
}

/** Default production / coexistence checklist items (UI toggles). */
export const WHATSAPP_PRODUCTION_CHECKLIST = [
  { key: "metaBusinessVerified", label: "Meta Business verified" },
  { key: "testNumberWorking", label: "Meta test number sends/receives in sandbox/test" },
  { key: "webhookHttpsVerified", label: "Webhook HTTPS endpoint verified (Cloud Functions)" },
  { key: "secretsInSecretManager", label: "Access token & app secret only in Secret Manager" },
  { key: "templatesApproved", label: "Utility templates approved in Meta" },
  { key: "noGroupMessaging", label: "Confirmed: no tenant rent details in groups" },
  { key: "coexistencePlanReviewed", label: "Coexistence / number migration plan reviewed with client" },
  { key: "writtenApproval", label: "Written approval to move off test number" },
  { key: "monitoringAlerts", label: "Delivery failure alerts configured" },
  { key: "rollbackPlan", label: "Rollback plan documented" },
];

// ============================================================================
// Phase 8 — Maintenance, move-in/out checklists, operational reports
// ============================================================================

export async function createMaintenanceTicket(data, actorUserId) {
  const payload = {
    tenantUserId: data.tenantUserId || null,
    applicantName: data.applicantName || "",
    propertyId: data.propertyId || null,
    roomId: data.roomId || null,
    bedId: data.bedId || null,
    allocationId: data.allocationId || null,
    tenancyId: data.tenancyId || null,
    ownerId: data.ownerId || null,
    createdBy: actorUserId || data.createdBy || null,
    category: data.category || "other",
    priority: data.priority || data.urgency || "medium",
    urgency: data.urgency || data.priority || "medium",
    title: data.title || "Maintenance request",
    description: data.description || "",
    attachments: data.attachments || [],
    preferredTimes: data.preferredTimes || "",
    status: "new",
    statusHistory: [
      { from: null, to: "new", at: new Date().toISOString(), by: actorUserId, note: "created" },
    ],
    assigneeId: null,
    resolvedAt: null,
    resolutionNote: "",
    escalated: data.urgency === "urgent",
    // mediation flag so staff list can include allocation-linked tickets
    source: data.source || "staff",
  };

  const id = await createDocument(COLLECTIONS.REQUESTS, payload);

  if (actorUserId) {
    await createAuditLog(actorUserId, "maintenance.create", "request", id, null, {
      urgency: payload.urgency,
      propertyId: payload.propertyId,
    });
  }

  // Notify desk via sandbox email log (no external send)
  try {
    await enqueueOutboundEmail({
      to: "desk@sandbox.local",
      subject: `Maintenance: ${payload.title}`,
      template: "maintenance_new",
      payload: { requestId: id, urgency: payload.urgency },
      idempotencyKey: `maint-notify:${id}`,
      actorUserId,
    });
  } catch {
    /* optional */
  }

  return id;
}

export async function getAllMaintenanceTickets(filters = {}) {
  let rows = await queryDocuments(
    COLLECTIONS.REQUESTS,
    [],
    { field: "createdAt", direction: "desc" },
    200
  );
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters.propertyId) rows = rows.filter((r) => r.propertyId === filters.propertyId);
  if (filters.urgency) rows = rows.filter((r) => (r.urgency || r.priority) === filters.urgency);
  return rows;
}

function emptyChecklist(items) {
  const map = {};
  for (const item of items) {
    map[item.key] = { done: false, at: null, by: null, note: "" };
  }
  return map;
}

export async function createMoveEvent(
  { type, allocationId, plannedDate = null, notes = "" },
  actorUserId
) {
  if (!["move_in", "move_out"].includes(type)) throw new Error("Invalid move event type");
  const allocation = await getDocument(COLLECTIONS.ALLOCATIONS, allocationId);
  if (!allocation) throw new Error("Allocation not found");

  const items =
    type === "move_in" ? MOVE_IN_CHECKLIST_ITEMS : MOVE_OUT_CHECKLIST_ITEMS;

  const payload = {
    type,
    status: "in_progress",
    allocationId,
    propertyId: allocation.propertyId || null,
    roomId: allocation.roomId || null,
    bedId: allocation.bedId || null,
    tenantUserId: allocation.tenantUserId || null,
    applicantName: allocation.applicantName || "",
    plannedDate: plannedDate || allocation.startDate || null,
    checklist: emptyChecklist(items),
    notes: notes || "",
    legalFlags: [], // staff may add notice/deposit review flags — never auto-concluded
    completedAt: null,
    createdBy: actorUserId,
  };

  const id = await createDocument(COLLECTIONS.MOVE_EVENTS, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "move.create", "move_event", id, null, { type });
  }
  return id;
}

export async function updateMoveChecklistItem(
  moveEventId,
  itemKey,
  { done, note },
  actorUserId
) {
  const event = await getDocument(COLLECTIONS.MOVE_EVENTS, moveEventId);
  if (!event) throw new Error("Move event not found");
  if (!event.checklist?.[itemKey]) throw new Error("Unknown checklist item");

  const checklist = {
    ...event.checklist,
    [itemKey]: {
      done: Boolean(done),
      at: done ? new Date().toISOString() : null,
      by: actorUserId,
      note: note || event.checklist[itemKey].note || "",
    },
  };

  await updateDocument(COLLECTIONS.MOVE_EVENTS, moveEventId, { checklist });
  if (actorUserId) {
    await createAuditLog(actorUserId, "move.checklist", "move_event", moveEventId, null, {
      itemKey,
      done: Boolean(done),
    });
  }
}

export async function completeMoveEvent(moveEventId, actorUserId) {
  const event = await getDocument(COLLECTIONS.MOVE_EVENTS, moveEventId);
  if (!event) throw new Error("Move event not found");

  const items = Object.values(event.checklist || {});
  const incomplete = items.filter((i) => !i.done);
  if (incomplete.length) {
    throw new Error(
      `Complete all checklist items first (${incomplete.length} remaining). Legal/notice items need staff confirmation — not automated.`
    );
  }

  await updateDocument(COLLECTIONS.MOVE_EVENTS, moveEventId, {
    status: "completed",
    completedAt: serverTimestamp(),
    completedBy: actorUserId,
  });

  if (event.type === "move_out" && event.allocationId) {
    // End allocation only after checklist (including allocation_end_approved)
    const allocation = await getDocument(COLLECTIONS.ALLOCATIONS, event.allocationId);
    if (allocation && !["ended", "cancelled"].includes(allocation.status)) {
      await updateDocument(COLLECTIONS.ALLOCATIONS, event.allocationId, {
        status: "ended",
        actualEndDate: new Date().toISOString().slice(0, 10),
      });
    }
    // Hold bed for cleaning if flagged; else free if availability_reopened done
    if (event.bedId) {
      const hold = event.checklist?.bed_cleaning_hold?.done;
      const reopen = event.checklist?.availability_reopened?.done;
      if (hold && !reopen) {
        await updateBed(
          event.bedId,
          { status: "maintenance", currentAllocationId: null },
          actorUserId
        );
      } else if (reopen) {
        await updateBed(
          event.bedId,
          { status: "available", currentAllocationId: null },
          actorUserId
        );
      }
    }
  }

  if (event.type === "move_in" && event.allocationId) {
    await updateDocument(COLLECTIONS.ALLOCATIONS, event.allocationId, {
      status: "active",
    });
    if (event.bedId) {
      await updateBed(event.bedId, { status: "occupied" }, actorUserId);
    }
  }

  if (actorUserId) {
    await createAuditLog(actorUserId, "move.complete", "move_event", moveEventId);
  }
}

export async function addMoveLegalFlag(moveEventId, flag, actorUserId) {
  const event = await getDocument(COLLECTIONS.MOVE_EVENTS, moveEventId);
  if (!event) throw new Error("Move event not found");
  const legalFlags = [
    ...(event.legalFlags || []),
    { flag, at: new Date().toISOString(), by: actorUserId },
  ];
  await updateDocument(COLLECTIONS.MOVE_EVENTS, moveEventId, { legalFlags });
}

export async function getAllMoveEvents(type = null) {
  const conditions = type ? [{ field: "type", operator: "==", value: type }] : [];
  return queryDocuments(
    COLLECTIONS.MOVE_EVENTS,
    conditions,
    { field: "createdAt", direction: "desc" },
    200
  );
}

/**
 * Role-restricted operational report from persisted data (staff desk).
 */
export async function buildOperationalReport({ fromDate = null, toDate = null } = {}) {
  const [
    properties,
    rooms,
    beds,
    applications,
    allocations,
    contracts,
    charges,
    requests,
    deliveryLogs,
    moveEvents,
  ] = await Promise.all([
    getAllProperties(),
    getAllRooms(),
    queryDocuments(COLLECTIONS.BEDS, [], null, 500),
    getAllApplications(),
    getAllAllocations(),
    getAllContracts(),
    getAllRentCharges(),
    getAllMaintenanceTickets(),
    getDeliveryLogs(200),
    getAllMoveEvents(),
  ]);

  const inRange = (iso) => {
    if (!iso) return true;
    const d = String(iso).slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  const bedsByStatus = beds.reduce((acc, b) => {
    acc[b.status || "unknown"] = (acc[b.status || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const occupancyByProperty = properties.map((p) => {
    const pb = beds.filter((b) => b.propertyId === p.id);
    const occupied = pb.filter((b) => ["occupied", "reserved"].includes(b.status)).length;
    return {
      propertyId: p.id,
      name: p.name,
      totalBeds: pb.length,
      occupied,
      available: pb.filter((b) => b.status === "available").length,
      occupancyRate: pb.length ? Math.round((occupied / pb.length) * 100) : 0,
    };
  });

  const appsByStatus = applications.reduce((acc, a) => {
    acc[a.status || "unknown"] = (acc[a.status || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const upcomingMoveIns = allocations.filter(
    (a) =>
      ["reserved", "active"].includes(a.status) &&
      a.startDate &&
      inRange(a.startDate)
  );
  const contractsEnding = contracts.filter(
    (c) =>
      ["approved", "issued", "signed"].includes(c.status) &&
      c.endDate &&
      inRange(c.endDate)
  );

  const rentSummary = charges.reduce(
    (acc, c) => {
      const due = Number(c.amountDue ?? c.amount) || 0;
      const paid = Number(c.paidAmount) || 0;
      acc.charged += due;
      acc.collected += paid;
      acc.outstanding += Math.max(0, due - paid);
      if (c.status === "overdue") acc.overdue += Math.max(0, due - paid);
      return acc;
    },
    { charged: 0, collected: 0, outstanding: 0, overdue: 0 }
  );

  const delivery = {
    total: deliveryLogs.length,
    sandbox: deliveryLogs.filter((l) => String(l.mode || "").includes("sandbox")).length,
    failed: deliveryLogs.filter((l) =>
      ["failed", "live_blocked"].includes(l.status)
    ).length,
  };

  const ticketOpen = requests.filter(
    (r) => !["resolved", "closed"].includes(r.status)
  ).length;
  const ticketUrgent = requests.filter(
    (r) => (r.urgency || r.priority) === "urgent" && !["resolved", "closed"].includes(r.status)
  ).length;

  const resolvedWithTimes = requests
    .filter((r) => r.resolvedAt && r.createdAt)
    .map((r) => {
      const start = r.createdAt?.toMillis?.() || 0;
      const end = r.resolvedAt?.toMillis?.() || 0;
      return end && start ? (end - start) / (1000 * 60 * 60) : null;
    })
    .filter((h) => h != null);
  const avgResolutionHours = resolvedWithTimes.length
    ? Math.round(
        (resolvedWithTimes.reduce((a, b) => a + b, 0) / resolvedWithTimes.length) * 10
      ) / 10
    : null;

  return {
    generatedAt: new Date().toISOString(),
    timezone: "Europe/Berlin",
    range: { fromDate, toDate },
    inventory: {
      properties: properties.length,
      rooms: rooms.length,
      beds: beds.length,
      bedsByStatus,
      occupancyByProperty,
    },
    applications: {
      total: applications.length,
      byStatus: appsByStatus,
    },
    lifecycle: {
      upcomingMoveIns: upcomingMoveIns.length,
      contractsEndingSoon: contractsEnding.length,
      moveEvents: moveEvents.length,
      moveInsCompleted: moveEvents.filter(
        (m) => m.type === "move_in" && m.status === "completed"
      ).length,
      moveOutsCompleted: moveEvents.filter(
        (m) => m.type === "move_out" && m.status === "completed"
      ).length,
    },
    rent: rentSummary,
    notifications: delivery,
    maintenance: {
      open: ticketOpen,
      urgentOpen: ticketUrgent,
      total: requests.length,
      avgResolutionHours,
    },
  };
}

// ============================================================================
// Phase 9 — Production hardening settings & readiness
// ============================================================================

const HARDENING_SETTINGS_DOC = "hardening";

export const DEFAULT_HARDENING_SETTINGS = {
  maintenanceMode: false,
  publicApplyEnabled: true,
  publicChatEnabled: true,
  emailMode: "sandbox", // sandbox | live (live requires Functions + approval)
  observabilityNotes: "",
  lastBackupVerifiedAt: null,
  lastRestoreDrillAt: null,
  securityChecklist: {},
  productionChecklist: {},
};

/** Public/staff readable ops flags (no secrets). */
export async function getHardeningSettings() {
  const docData = await getDocument(COLLECTIONS.PLATFORM_SETTINGS, HARDENING_SETTINGS_DOC);
  return {
    ...DEFAULT_HARDENING_SETTINGS,
    ...(docData || {}),
    id: HARDENING_SETTINGS_DOC,
  };
}

export async function updateHardeningSettings(partial, actorUserId) {
  const current = await getHardeningSettings();
  const safe = { ...partial };
  // Never accept secrets via this doc
  delete safe.accessToken;
  delete safe.apiKey;
  delete safe.smtpPassword;
  delete safe.serviceAccount;

  const next = {
    ...current,
    ...safe,
    updatedAt: serverTimestamp(),
    updatedBy: actorUserId || null,
  };
  delete next.id;

  await setDoc(doc(db, COLLECTIONS.PLATFORM_SETTINGS, HARDENING_SETTINGS_DOC), next, {
    merge: true,
  });
  if (actorUserId) {
    await createAuditLog(
      actorUserId,
      "hardening.settings",
      "platform_settings",
      HARDENING_SETTINGS_DOC,
      null,
      {
        maintenanceMode: next.maintenanceMode,
        publicApplyEnabled: next.publicApplyEnabled,
        publicChatEnabled: next.publicChatEnabled,
        emailMode: next.emailMode,
      }
    );
  }
  return getHardeningSettings();
}

/** Static security review checklist for the ops desk (UI toggles). */
export const SECURITY_REVIEW_CHECKLIST = [
  { key: "rulesDeployed", label: "Latest firestore.rules deployed to production" },
  { key: "indexesDeployed", label: "Composite indexes deployed" },
  { key: "bootstrapLocked", label: "platform_settings/lock present (bootstrap closed)" },
  { key: "noViteSecrets", label: "No provider tokens in VITE_* env" },
  { key: "whatsappSandbox", label: "WhatsApp not live without productionApproved" },
  { key: "emailSandbox", label: "Email remains sandbox until Functions + approval" },
  { key: "adminMfa", label: "Admin Firebase account uses strong password / MFA where available" },
  { key: "auditReviewed", label: "Recent audit_logs spot-checked" },
  { key: "messagesParticipantIds", label: "New messages write participantIds (ready for tighter rules)" },
  { key: "rateLimitsClient", label: "Client rate limits on apply / chat / register" },
];

export const PRODUCTION_READINESS_CHECKLIST = [
  { key: "backupSchedule", label: "Firestore export / backup schedule configured" },
  { key: "restoreDrill", label: "Restore drill documented with date" },
  { key: "hostingDeploy", label: "Hosting / CDN deploy path documented" },
  { key: "rollbackPlan", label: "Rollback steps tested (rules + app build)" },
  { key: "monitoring", label: "Firebase / console alerts watched (Auth, Firestore)" },
  { key: "staffGuideShared", label: "Staff guide shared with operators" },
  { key: "handoverComplete", label: "Client handover checklist complete" },
];

// ============================================================================
// Manager browse share links (unlisted /browse/:slug)
// ============================================================================

export function makeBrowseLinkSlug(title = "rooms") {
  const base =
    String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "rooms";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Build public-safe room cards from inventory for embedding on a browse link.
 * Only available beds are included unless selectedBedIds is provided.
 */
export async function buildBrowseLinkItems(propertyIds = [], selectedBedIds = null) {
  const ids = [...new Set((propertyIds || []).filter(Boolean))];
  const selected =
    selectedBedIds && selectedBedIds.length > 0 ? new Set(selectedBedIds) : null;
  const items = [];

  for (const propertyId of ids) {
    const inv = await getPropertyInventory(propertyId);
    const property = inv.property;
    if (!property) continue;

    for (const room of inv.rooms || []) {
      if (room.status && room.status !== "active") continue;
      for (const bed of room.beds || []) {
        if (selected) {
          if (!selected.has(bed.id)) continue;
        } else if (bed.status !== "available") {
          continue;
        }

        const offers = await getOffersForBed(bed.id);
        const offer = offers[0] || null;

        items.push({
          propertyId,
          roomId: room.id,
          bedId: bed.id,
          propertyName: property.name || "",
          city: property.city || "",
          area: property.area || "",
          address: property.address || "",
          postalCode: property.postalCode || "",
          roomLabel: room.label || "Room",
          roomType: room.roomType || "private",
          roomDescription: room.description || "",
          bedLabel: bed.label || "Bed",
          bedStatus: bed.status || "available",
          photo: room.photos?.[0] || property.coverImage || null,
          monthlyRent: offer?.monthlyRent ?? null,
          depositAmount: offer?.depositAmount ?? null,
          currency: offer?.currency || "EUR",
          availableFrom: offer?.availableFrom || null,
        });
      }
    }
  }

  return items;
}

export async function listBrowseLinks() {
  return queryDocuments(COLLECTIONS.BROWSE_LINKS, [], { field: "createdAt", direction: "desc" });
}

export async function getBrowseLink(slug) {
  if (!slug) return null;
  return getDocument(COLLECTIONS.BROWSE_LINKS, slug);
}

/** Public: only returns active links (inactive docs are blocked by rules for non-staff). */
export async function getPublicBrowseLink(slug) {
  try {
    const link = await getBrowseLink(slug);
    if (!link || link.status !== "active") return null;
    return link;
  } catch {
    return null;
  }
}

export async function createBrowseLink(data, actorUserId) {
  const title = (data.title || "Available rooms").trim();
  let slug = (data.slug || makeBrowseLinkSlug(title)).toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) slug = makeBrowseLinkSlug(title);

  const existing = await getBrowseLink(slug);
  if (existing) throw new Error("That link slug is already in use — try another name");

  const propertyIds = [...new Set((data.propertyIds || []).filter(Boolean))];
  if (propertyIds.length === 0) throw new Error("Select at least one property");

  const selectedBedIds = data.bedIds?.length ? data.bedIds : null;
  const items = await buildBrowseLinkItems(propertyIds, selectedBedIds);

  const payload = {
    slug,
    title,
    description: data.description || "",
    propertyIds,
    bedIds: selectedBedIds || [],
    items,
    status: data.status === "inactive" ? "inactive" : "active",
    createdBy: actorUserId,
  };

  await createDocumentWithId(COLLECTIONS.BROWSE_LINKS, slug, payload);
  if (actorUserId) {
    await createAuditLog(actorUserId, "browse_link.create", "browse_link", slug, null, {
      propertyIds,
      itemCount: items.length,
    });
  }
  return slug;
}

export async function updateBrowseLink(slug, data, actorUserId = null) {
  const current = await getBrowseLink(slug);
  if (!current) throw new Error("Browse link not found");

  const updates = {};
  if (data.title !== undefined) updates.title = String(data.title).trim();
  if (data.description !== undefined) updates.description = data.description || "";
  if (data.status !== undefined) {
    updates.status = data.status === "inactive" ? "inactive" : "active";
  }
  if (data.propertyIds !== undefined) {
    updates.propertyIds = [...new Set((data.propertyIds || []).filter(Boolean))];
  }
  if (data.bedIds !== undefined) {
    updates.bedIds = data.bedIds || [];
  }

  const propertyIds = updates.propertyIds || current.propertyIds || [];
  const bedIds =
    updates.bedIds !== undefined
      ? updates.bedIds
      : current.bedIds || [];
  const selected = bedIds.length > 0 ? bedIds : null;

  if (
    data.refreshItems ||
    data.propertyIds !== undefined ||
    data.bedIds !== undefined
  ) {
    updates.items = await buildBrowseLinkItems(propertyIds, selected);
  }

  await updateDocument(COLLECTIONS.BROWSE_LINKS, slug, updates);
  if (actorUserId) {
    await createAuditLog(actorUserId, "browse_link.update", "browse_link", slug);
  }
}

export async function deleteBrowseLink(slug, actorUserId = null) {
  await deleteDocument(COLLECTIONS.BROWSE_LINKS, slug);
  if (actorUserId) {
    await createAuditLog(actorUserId, "browse_link.delete", "browse_link", slug);
  }
}

/**
 * Renter applies from a shared browse link (no public listing required).
 * Uses denormalized link items so renters never need property read access.
 */
export async function createBrowseLinkApplication(renterId, browseSlug, item, data = {}) {
  if (!renterId) throw new Error("Sign in as a renter to apply");
  if (!browseSlug) throw new Error("Browse link is required");
  if (!item?.propertyId) throw new Error("Room selection is required");

  const link = await getPublicBrowseLink(browseSlug);
  if (!link) throw new Error("This browse link is no longer available");

  const matched = (link.items || []).find(
    (row) =>
      (item.bedId && row.bedId === item.bedId) ||
      (row.roomId === item.roomId && row.propertyId === item.propertyId)
  );
  if (!matched) throw new Error("That room is not on this browse link");

  const email = String(data.applicantEmail || "").trim().toLowerCase();
  if (matched.propertyId) {
    const existing = await queryDocuments(COLLECTIONS.APPLICATIONS, [
      { field: "renterId", operator: "==", value: renterId },
      { field: "propertyId", operator: "==", value: matched.propertyId },
    ]);
    const open = existing.find(
      (a) => !["withdrawn", "rejected", "expired", "closed", "allocated"].includes(a.status)
    );
    if (open) {
      throw new Error("You already have an open application for this property");
    }
  }

  const title = `${matched.propertyName || "Room"} · ${matched.roomLabel || "Room"}`;
  const payload = {
    renterId,
    listingId: null,
    ownerId: null,
    ownerRecordId: null,
    propertyId: matched.propertyId,
    roomId: matched.roomId || null,
    bedId: matched.bedId || null,
    requestedRoomType: matched.roomType || data.requestedRoomType || "",
    listingTitle: title,
    applicantName: data.applicantName || "",
    applicantEmail: email,
    applicantPhone: data.applicantPhone || "",
    desiredMoveIn: data.desiredMoveIn || null,
    intendedDuration: data.intendedDuration || "",
    message: data.message || "",
    occupation: data.occupation || "",
    monthlyIncome: data.monthlyIncome || null,
    numberOfOccupants: Number(data.numberOfOccupants) || 1,
    hasPets: data.hasPets || false,
    petDetails: data.petDetails || "",
    internalNotes: "",
    assignedManagerId: link.createdBy || null,
    status: "new",
    submittedAt: serverTimestamp(),
    decidedAt: null,
    decisionNote: "",
    allocationId: null,
    source: "browse_link",
    browseLinkSlug: browseSlug,
    createdBy: renterId,
  };

  return createDocument(COLLECTIONS.APPLICATIONS, payload);
}


