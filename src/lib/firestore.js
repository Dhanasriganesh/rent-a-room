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
} from "firebase/firestore";
import { db } from "./firebase";

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  OWNER_PROFILES: "owner_profiles",
  RENTER_PROFILES: "renter_profiles",
  PROPERTIES: "properties",
  UNITS: "units",
  LISTINGS: "listings",
  LISTING_MEDIA: "listing_media",
  APPLICATIONS: "applications",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  TENANCIES: "tenancies",
  TENANCY_MEMBERS: "tenancy_members",
  DOCUMENT_REQUESTS: "document_requests",
  DOCUMENTS: "documents",
  RENT_CHARGES: "rent_charges",
  PAYMENTS: "payments",
  REQUESTS: "requests",
  REQUEST_COMMENTS: "request_comments",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
  OWNER_DOMAINS: "owner_domains",
  SUBSCRIPTION_PLANS: "subscription_plans",
  OWNER_SUBSCRIPTIONS: "owner_subscriptions",
};

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

export async function queryDocuments(collectionName, conditions = [], sortBy = null, limitCount = null) {
  let q = collection(db, collectionName);
  
  const queryConstraints = [];
  
  conditions.forEach(({ field, operator, value }) => {
    queryConstraints.push(where(field, operator, value));
  });
  
  if (sortBy) {
    queryConstraints.push(orderBy(sortBy.field, sortBy.direction || "asc"));
  }
  
  if (limitCount) {
    queryConstraints.push(limit(limitCount));
  }
  
  q = query(q, ...queryConstraints);
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ============================================================================
// Property Operations
// ============================================================================

export async function createProperty(ownerId, data) {
  const propertyData = {
    ownerId,
    name: data.name,
    address: data.address,
    city: data.city,
    postalCode: data.postalCode || "",
    country: data.country || "Germany",
    propertyType: data.propertyType,
    description: data.description || "",
    yearBuilt: data.yearBuilt || null,
    totalUnits: 0,
    occupiedUnits: 0,
    status: "active",
    images: data.images || [],
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
  
  return queryDocuments(COLLECTIONS.LISTINGS, conditions, { field: "publishedAt", direction: "desc" });
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
  const listing = await getDocument(COLLECTIONS.LISTINGS, listingId);
  if (!listing) throw new Error("Listing not found");
  
  const applicationData = {
    renterId,
    listingId,
    ownerId: listing.ownerId,
    listingTitle: listing.title,
    desiredMoveIn: data.desiredMoveIn,
    message: data.message || "",
    occupation: data.occupation || "",
    monthlyIncome: data.monthlyIncome || null,
    numberOfOccupants: data.numberOfOccupants || 1,
    hasPets: data.hasPets || false,
    petDetails: data.petDetails || "",
    status: "new",
    submittedAt: serverTimestamp(),
    decidedAt: null,
    decisionNote: "",
  };
  
  const appId = await createDocument(COLLECTIONS.APPLICATIONS, applicationData);
  
  // Increment application count on listing
  const docRef = doc(db, COLLECTIONS.LISTINGS, listingId);
  await updateDoc(docRef, {
    applicationCount: increment(1),
  });
  
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

export async function updateApplicationStatus(applicationId, status, note = "") {
  await updateDocument(COLLECTIONS.APPLICATIONS, applicationId, {
    status,
    decisionNote: note,
    decidedAt: serverTimestamp(),
  });
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
  const charge = await getDocument(COLLECTIONS.RENT_CHARGES, chargeId);
  if (!charge) throw new Error("Charge not found");
  
  const paymentData = {
    rentChargeId: chargeId,
    tenancyId: charge.tenancyId,
    ownerId: charge.ownerId,
    payerId: data.payerId,
    amount: data.amount,
    currency: charge.currency,
    method: data.method || "bank_transfer",
    reference: data.reference || "",
    isManual: data.isManual || false,
    notes: data.notes || "",
    status: "succeeded",
    paidAt: serverTimestamp(),
  };
  
  const paymentId = await createDocument(COLLECTIONS.PAYMENTS, paymentData);
  
  // Update charge
  const newPaidAmount = charge.paidAmount + data.amount;
  const newStatus = newPaidAmount >= charge.amount ? "paid" : "partial";
  
  await updateDocument(COLLECTIONS.RENT_CHARGES, chargeId, {
    paidAmount: newPaidAmount,
    status: newStatus,
    paidAt: newStatus === "paid" ? serverTimestamp() : null,
  });
  
  return paymentId;
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

export async function updateRequestStatus(requestId, status, note = "") {
  const updates = { status };
  if (status === "resolved" || status === "closed") {
    updates.resolvedAt = serverTimestamp();
    updates.resolutionNote = note;
  }
  await updateDocument(COLLECTIONS.REQUESTS, requestId, updates);
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
    documentRequestId: data.documentRequestId || null,
    documentType: data.documentType,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    storageKey: data.storageKey, // Base64 or external URL
    reviewStatus: "uploaded",
    reviewNote: "",
    expiresAt: data.expiresAt || null,
  };
  
  const docId = await createDocument(COLLECTIONS.DOCUMENTS, docData);
  
  // Update document request if exists
  if (data.documentRequestId) {
    await updateDocument(COLLECTIONS.DOCUMENT_REQUESTS, data.documentRequestId, {
      status: "uploaded",
    });
  }
  
  return docId;
}

export async function reviewDocument(documentId, status, note = "") {
  await updateDocument(COLLECTIONS.DOCUMENTS, documentId, {
    reviewStatus: status,
    reviewNote: note,
  });
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

export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where("userId", "==", userId),
    where("status", "==", "unread"),
    orderBy("sentAt", "desc"),
    limit(20)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(notifications);
  });
}

export function subscribeToMessages(conversationId, callback) {
  const q = query(
    collection(db, COLLECTIONS.MESSAGES),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
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
// Owner Profile Operations
// ============================================================================

export async function getOwnerProfile(userId) {
  return getDocument(COLLECTIONS.OWNER_PROFILES, userId);
}

export async function updateOwnerProfile(userId, data) {
  return updateDocument(COLLECTIONS.OWNER_PROFILES, userId, data);
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
  
  const savedListings = profile.savedListings || [];
  const index = savedListings.indexOf(listingId);
  
  if (index > -1) {
    savedListings.splice(index, 1);
  } else {
    savedListings.push(listingId);
  }
  
  await updateRenterProfile(userId, { savedListings });
  return savedListings;
}
