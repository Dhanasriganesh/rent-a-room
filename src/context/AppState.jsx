import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addLead,
  addOwnerAccount,
  authenticate,
  loadSession,
  loadState,
  markReferralPaid,
  registerUser,
  reviewRequest,
  saveListing,
  SESSION_KEY,
  setLandlordNote,
  setLeadStatus,
  STORAGE_KEY,
  submitRequest,
  toggleSaved,
  updateProfile,
} from "../lib/store";
import { seedState } from "../data/seed";

const AppContext = createContext(null);

export function AppStateProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [sessionId, setSessionId] = useState(loadSession);
  const [notice, setNotice] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && !state.users.some((user) => user.id === sessionId)) setSessionId(null);
  }, [sessionId, state.users]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4600);
    return () => clearTimeout(timer);
  }, [notice]);

  const user = useMemo(
    () => state.users.find((item) => item.id === sessionId) || null,
    [state.users, sessionId],
  );

  const notify = useCallback((message) => setNotice(message), []);

  const login = useCallback((email, password) => {
    const result = authenticate(stateRef.current, email, password);
    if (result.user) setSessionId(result.user.id);
    return result;
  }, []);

  const logout = useCallback(() => setSessionId(null), []);

  const register = useCallback((input) => {
    const result = registerUser(stateRef.current, input);
    if (!result.error) {
      setState(result.state);
      setSessionId(result.user.id);
    }
    return result;
  }, []);

  const sendRequest = useCallback((input) => {
    const current = stateRef.current;
    const active = current.users.find((item) => item.id === sessionId) || null;
    const seeker = active?.role === "seeker" ? active : null;
    const result = submitRequest(current, input, seeker);
    setState(result.state);
    return result;
  }, [sessionId]);

  const review = useCallback((input) => {
    setState(reviewRequest(stateRef.current, input));
  }, []);

  const saveRoom = useCallback((input) => {
    setState(saveListing(stateRef.current, input));
  }, []);

  const toggleSave = useCallback((listingId) => {
    if (!sessionId) return;
    setState(toggleSaved(stateRef.current, sessionId, listingId));
  }, [sessionId]);

  const saveProfile = useCallback((input) => {
    const result = updateProfile(stateRef.current, sessionId, input);
    if (!result.error) setState(result.state);
    return result;
  }, [sessionId]);

  const noteFromOwner = useCallback((id, note) => {
    setState(setLandlordNote(stateRef.current, id, note));
  }, []);

  const createLead = useCallback((input) => {
    const result = addLead(stateRef.current, input);
    setState(result.state);
    return result;
  }, []);

  const updateLead = useCallback((id, status) => {
    setState(setLeadStatus(stateRef.current, id, status));
  }, []);

  const createOwner = useCallback((input) => {
    const result = addOwnerAccount(stateRef.current, input);
    if (!result.error) setState(result.state);
    return result;
  }, []);

  const payReferral = useCallback((id) => {
    setState(markReferralPaid(stateRef.current, id));
  }, []);

  const resetDemo = useCallback(() => {
    setState(seedState());
    setSessionId(null);
    setNotice("Demo data restored in this browser.");
  }, []);

  const value = {
    state,
    user,
    notice,
    notify,
    login,
    logout,
    register,
    sendRequest,
    review,
    saveRoom,
    toggleSave,
    saveProfile,
    noteFromOwner,
    createLead,
    updateLead,
    createOwner,
    payReferral,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppStateProvider");
  return context;
}
