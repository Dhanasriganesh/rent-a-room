import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  reload,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import {
  COLLECTIONS,
  createAuditLog,
  tryBootstrapAdmin,
  claimStaffInvitation,
} from "../lib/firestore";
import {
  ACCOUNT_STATUS,
  DEFAULT_NOTIFICATION_PREFS,
  SUBSCRIPTION_STATUS,
} from "../lib/statuses";

const AuthContext = createContext(null);

export const USER_ROLES = {
  ADMIN: "admin",
  OWNER: "owner",
  RENTER: "renter",
  PROPERTY_MANAGER: "property_manager",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function fetchUserProfile(uid) {
  const profileDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!profileDoc.exists()) return null;
  return { id: profileDoc.id, ...profileDoc.data() };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [renterProfile, setRenterProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoleProfiles = async (uid, role) => {
    if (role === USER_ROLES.OWNER) {
      const snap = await getDoc(doc(db, COLLECTIONS.OWNER_PROFILES, uid));
      setOwnerProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setRenterProfile(null);
    } else if (role === USER_ROLES.RENTER) {
      const snap = await getDoc(doc(db, COLLECTIONS.RENTER_PROFILES, uid));
      setRenterProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setOwnerProfile(null);
    } else {
      setOwnerProfile(null);
      setRenterProfile(null);
    }
  };

  const syncEmailVerified = async (firebaseUser, profile) => {
    if (!firebaseUser || !profile) return profile;
    if (firebaseUser.emailVerified && !profile.emailVerified) {
      await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
        emailVerified: true,
        emailVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ...profile, emailVerified: true };
    }
    return profile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          let profile = await fetchUserProfile(firebaseUser.uid);
          profile = await syncEmailVerified(firebaseUser, profile);
          setUserProfile(profile);
          if (profile?.role) {
            await loadRoleProfiles(firebaseUser.uid, profile.role);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserProfile(null);
          setOwnerProfile(null);
          setRenterProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setOwnerProfile(null);
        setRenterProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!auth.currentUser) return null;
    await reload(auth.currentUser);
    setUser(auth.currentUser);
    let profile = await fetchUserProfile(auth.currentUser.uid);
    profile = await syncEmailVerified(auth.currentUser, profile);
    setUserProfile(profile);
    if (profile?.role) {
      await loadRoleProfiles(auth.currentUser.uid, profile.role);
    }
    return profile;
  };

  const register = async ({
    email,
    password,
    displayName,
    role,
    phone = "",
    city = "",
  }) => {
    if (![USER_ROLES.OWNER, USER_ROLES.RENTER].includes(role)) {
      throw new Error("Invalid account role");
    }

    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName });

      const publicSlug =
        slugify(displayName) || firebaseUser.uid.slice(0, 8);

      const userDoc = {
        email: firebaseUser.email,
        displayName,
        phone,
        city,
        role,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        emailVerified: false,
        emailVerifiedAt: null,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), userDoc);

      // One-time bootstrap: elevate matching email to admin when configured and unlocked
      try {
        await tryBootstrapAdmin(firebaseUser.uid, firebaseUser.email);
      } catch (bootstrapErr) {
        console.warn("Bootstrap admin skipped:", bootstrapErr?.message || bootstrapErr);
      }

      if (role === USER_ROLES.OWNER) {
        const ownerProfileDoc = {
          userId: firebaseUser.uid,
          verificationStatus: "pending",
          businessType: "individual",
          companyName: "",
          siteName: displayName,
          publicSlug,
          brandSettings: {
            primaryColor: "#1a3c32",
            logo: null,
            description: "",
            contactEmail: email,
            contactPhone: phone,
            whatsapp: phone,
            showEmail: true,
            showWhatsApp: true,
            showInAppChat: true,
          },
          publicationStatus: "published",
          payoutAccountId: null,
          subscriptionPlanId: "starter",
          subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, COLLECTIONS.OWNER_PROFILES, firebaseUser.uid), ownerProfileDoc);

        await setDoc(doc(db, COLLECTIONS.OWNER_SITES, firebaseUser.uid), {
          ownerId: firebaseUser.uid,
          siteName: displayName,
          logoKey: null,
          brandSettings: ownerProfileDoc.brandSettings,
          publicSlug,
          publicationStatus: "published",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (role === USER_ROLES.RENTER) {
        const renterProfileDoc = {
          userId: firebaseUser.uid,
          verificationStatus: "pending",
          phone,
          preferences: {
            cities: city ? [city] : [],
            budgetMin: 0,
            budgetMax: 0,
            moveInDate: null,
            propertyTypes: [],
            furnished: null,
          },
          savedListings: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, COLLECTIONS.RENTER_PROFILES, firebaseUser.uid), renterProfileDoc);
      }

      await sendEmailVerification(firebaseUser);

      try {
        await createAuditLog(firebaseUser.uid, "user.register", "user", firebaseUser.uid, null, {
          role,
        });
      } catch {
        // Audit write should not block registration
      }

      let profile = await fetchUserProfile(firebaseUser.uid);
      setUserProfile(profile);
      await loadRoleProfiles(firebaseUser.uid, profile?.role || role);

      return { user: firebaseUser, profile };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const acceptStaffInvite = async (token) => {
    if (!auth.currentUser) {
      throw new Error("Sign in before accepting a staff invitation");
    }
    const role = await claimStaffInvitation(
      token,
      auth.currentUser.uid,
      auth.currentUser.email
    );
    await refreshProfile();
    return role;
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let profile = await fetchUserProfile(userCredential.user.uid);

      // Auth user exists but Firestore profile was never created (e.g. Console-only user)
      if (!profile) {
        await signOut(auth);
        const missing = new Error(
          "Your login works, but no Firestore user profile exists. In Firebase Console → Firestore, create users/{uid} with fields: email, displayName, role (e.g. admin), accountStatus: active."
        );
        missing.code = "app/missing-profile";
        throw missing;
      }

      if (profile?.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
        await signOut(auth);
        throw new Error("This account has been suspended. Contact support.");
      }

      if (profile?.accountStatus === ACCOUNT_STATUS.CANCELLED) {
        await signOut(auth);
        throw new Error("This account has been cancelled.");
      }

      profile = await syncEmailVerified(userCredential.user, profile);
      setUserProfile(profile);
      if (profile?.role) {
        await loadRoleProfiles(userCredential.user.uid, profile.role);
      }

      try {
        await createAuditLog(userCredential.user.uid, "user.login", "user", userCredential.user.uid);
      } catch {
        // non-blocking
      }

      return { user: userCredential.user, profile };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const uid = user?.uid;
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setOwnerProfile(null);
      setRenterProfile(null);
      if (uid) {
        try {
          await createAuditLog(uid, "user.logout", "user", uid);
        } catch {
          // non-blocking
        }
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;

    try {
      setError(null);
      const allowed = {
        displayName: updates.displayName,
        phone: updates.phone,
        city: updates.city,
        notificationPreferences: updates.notificationPreferences,
      };

      const payload = Object.fromEntries(
        Object.entries(allowed).filter(([, value]) => value !== undefined)
      );

      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        ...payload,
        updatedAt: serverTimestamp(),
      });

      if (updates.displayName) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      await refreshProfile();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /** Clear mustChangePassword after Auth password update succeeds */
  const completePasswordChange = async () => {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      mustChangePassword: false,
      passwordChangedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await refreshProfile();
  };

  const updateOwnerProfileData = async (updates) => {
    if (!user || userProfile?.role !== USER_ROLES.OWNER) return;
    await updateDoc(doc(db, COLLECTIONS.OWNER_PROFILES, user.uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    if (updates.siteName || updates.brandSettings || updates.publicSlug || updates.publicationStatus) {
      const siteUpdates = {};
      if (updates.siteName !== undefined) siteUpdates.siteName = updates.siteName;
      if (updates.brandSettings !== undefined) siteUpdates.brandSettings = updates.brandSettings;
      if (updates.publicSlug !== undefined) siteUpdates.publicSlug = updates.publicSlug;
      if (updates.publicationStatus !== undefined) {
        siteUpdates.publicationStatus = updates.publicationStatus;
      }
      await updateDoc(doc(db, COLLECTIONS.OWNER_SITES, user.uid), {
        ...siteUpdates,
        updatedAt: serverTimestamp(),
      });
    }

    await refreshProfile();
  };

  const updateRenterProfileData = async (updates) => {
    if (!user || userProfile?.role !== USER_ROLES.RENTER) return;
    await updateDoc(doc(db, COLLECTIONS.RENTER_PROFILES, user.uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await refreshProfile();
  };

  const value = {
    user,
    userProfile,
    ownerProfile,
    renterProfile,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
    updateUserProfile,
    completePasswordChange,
    updateOwnerProfileData,
    updateRenterProfileData,
    refreshProfile,
    acceptStaffInvite,
    isOwner: userProfile?.role === USER_ROLES.OWNER,
    isRenter: userProfile?.role === USER_ROLES.RENTER,
    isAdmin: userProfile?.role === USER_ROLES.ADMIN,
    isPropertyManager: userProfile?.role === USER_ROLES.PROPERTY_MANAGER,
    isStaff:
      userProfile?.role === USER_ROLES.ADMIN ||
      userProfile?.role === USER_ROLES.PROPERTY_MANAGER,
    isEmailVerified: Boolean(user?.emailVerified || userProfile?.emailVerified),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
