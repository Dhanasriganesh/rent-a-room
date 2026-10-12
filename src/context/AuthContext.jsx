import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

export const USER_ROLES = {
  ADMIN: "admin",
  OWNER: "owner",
  RENTER: "renter",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (profileDoc.exists()) {
            setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async ({ email, password, displayName, role, phone = "", city = "" }) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName });

      const userDoc = {
        email: firebaseUser.email,
        displayName,
        phone,
        city,
        role,
        accountStatus: "active",
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userDoc);

      if (role === USER_ROLES.OWNER) {
        const ownerProfile = {
          userId: firebaseUser.uid,
          verificationStatus: "pending",
          businessType: "individual",
          siteName: displayName.toLowerCase().replace(/\s+/g, "-"),
          publicSlug: firebaseUser.uid.slice(0, 8),
          brandSettings: {
            primaryColor: "#1a3c32",
            logo: null,
          },
          payoutAccountId: null,
          subscriptionStatus: "trial",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "owner_profiles", firebaseUser.uid), ownerProfile);
      }

      if (role === USER_ROLES.RENTER) {
        const renterProfile = {
          userId: firebaseUser.uid,
          verificationStatus: "pending",
          preferences: {
            cities: [],
            budgetMin: 0,
            budgetMax: 0,
            moveInDate: null,
          },
          savedListings: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "renter_profiles", firebaseUser.uid), renterProfile);
      }

      await sendEmailVerification(firebaseUser);

      const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      setUserProfile({ id: profileDoc.id, ...profileDoc.data() });

      return { user: firebaseUser };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (profileDoc.exists()) {
        setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
      }
      return { user: userCredential.user };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
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
      await updateDoc(doc(db, "users", user.uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      if (updates.displayName) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      const profileDoc = await getDoc(doc(db, "users", user.uid));
      setUserProfile({ id: profileDoc.id, ...profileDoc.data() });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
    updateUserProfile,
    isOwner: userProfile?.role === USER_ROLES.OWNER,
    isRenter: userProfile?.role === USER_ROLES.RENTER,
    isAdmin: userProfile?.role === USER_ROLES.ADMIN,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
