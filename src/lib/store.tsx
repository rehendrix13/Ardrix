// App-wide state: the player's data, saving on the device, syncing to their account,
// toasts, and level-up celebrations.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState } from "./types";
import { levelFor, totalXP } from "./game";
import { freshState, loadLocal, normalize, progressCount, saveLocal } from "./state";
import { getSession, onSessionChange, pullState, pushState, syncConfigured, type Session } from "./supabase";

export type SyncStatus = "off" | "signedout" | "syncing" | "synced" | "offline" | "error";
export const SYNC_TEXT: Record<SyncStatus, string> = {
  off: "Saved on this device", signedout: "Not backed up", syncing: "Syncing…", synced: "Synced",
  offline: "Offline · saved here", error: "Sync problem",
};

interface Conflict { remote: AppState }
interface StoreCtx {
  state: AppState;
  /** Change state with a mutating function; it runs on a copy, then saves and syncs. */
  update: (fn: (draft: AppState) => void) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  levelUp: number | null;
  dismissLevelUp: () => void;
  session: Session | null;
  syncStatus: SyncStatus;
  conflict: Conflict | null;
  resolveConflict: (keep: "account" | "device") => void;
  syncNow: () => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
};

const META_KEY = "ardrix-sync-meta";
interface Meta { syncedUser?: string }
const readMeta = (): Meta => { try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; } };
const writeMeta = (m: Meta) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadLocal);
  const stateRef = useRef(state);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [session, setSessionState] = useState<Session | null>(getSession);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncConfigured() ? (getSession() ? "syncing" : "signedout") : "off");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const toastTimer = useRef<number>(0);
  const pushTimer = useRef<number>(0);
  const pulling = useRef(false);

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    saveLocal(next);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const failStatus = () => setSyncStatus(navigator.onLine ? "error" : "offline");

  const push = useCallback(async () => {
    if (!getSession()) return;
    window.clearTimeout(pushTimer.current);
    setSyncStatus("syncing");
    try {
      await pushState(stateRef.current);
      writeMeta({ syncedUser: getSession()?.user.id });
      setSyncStatus("synced");
    } catch { failStatus(); }
  }, []);

  const pull = useCallback(async () => {
    const s = getSession();
    if (!s || pulling.current) return;
    pulling.current = true;
    setSyncStatus("syncing");
    try {
      const row = await pullState();
      const local = stateRef.current;
      const firstSync = readMeta().syncedUser !== s.user.id;
      if (!row) { pulling.current = false; return push(); }
      const remote = normalize(row.data);
      const localHas = progressCount(local) > 0 || local.trees.length > 0;
      const remoteHas = progressCount(remote) > 0 || remote.trees.length > 0;
      if (firstSync) {
        if (!remoteHas) { pulling.current = false; return push(); }
        if (localHas && local.updatedAt > 0 && remote.updatedAt !== local.updatedAt) {
          setConflict({ remote });
          setSyncStatus("synced");
        } else {
          commit(remote); writeMeta({ syncedUser: s.user.id }); setSyncStatus("synced");
        }
      } else if (remote.updatedAt > local.updatedAt) {
        commit(remote); setSyncStatus("synced");
      } else if (local.updatedAt > remote.updatedAt) {
        pulling.current = false; return push();
      } else setSyncStatus("synced");
    } catch { failStatus(); }
    pulling.current = false;
  }, [commit, push]);

  const schedulePush = useCallback(() => {
    const s = getSession();
    if (!s || readMeta().syncedUser !== s.user.id) return;
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(push, 1200);
  }, [push]);

  const update = useCallback((fn: (draft: AppState) => void) => {
    const prev = stateRef.current;
    const draft = structuredClone(prev);
    fn(draft);
    draft.updatedAt = Date.now();
    const before = levelFor(totalXP(prev)), after = levelFor(totalXP(draft));
    if (after > before) setLevelUp(after);
    commit(draft);
    schedulePush();
  }, [commit, schedulePush]);

  const resolveConflict = useCallback((keep: "account" | "device") => {
    const c = conflict; if (!c) return;
    setConflict(null);
    const s = getSession(); if (s) writeMeta({ syncedUser: s.user.id });
    if (keep === "account") { commit(c.remote); setSyncStatus("synced"); }
    else { const next = { ...stateRef.current, updatedAt: Date.now() }; commit(next); push(); }
  }, [conflict, commit, push]);

  const resetAll = useCallback(() => {
    const next = freshState();
    next.updatedAt = Date.now();
    commit(next);
    schedulePush();
  }, [commit, schedulePush]);

  // React to sign-in, sign-out and coming back online.
  useEffect(() => {
    const off = onSessionChange((s) => {
      setSessionState(s);
      if (s) pull(); else { setSyncStatus(syncConfigured() ? "signedout" : "off"); writeMeta({}); }
    });
    if (getSession()) pull();
    const onVisible = () => { if (document.visibilityState === "visible" && getSession()) pull(); };
    const onOnline = () => { if (getSession()) pull(); };
    const onOffline = () => { if (getSession()) setSyncStatus("offline"); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { off(); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [pull]);

  const value = useMemo<StoreCtx>(() => ({
    state, update, toast, toastMsg, levelUp, dismissLevelUp: () => setLevelUp(null),
    session, syncStatus, conflict, resolveConflict, syncNow: () => { pull(); }, resetAll,
  }), [state, update, toast, toastMsg, levelUp, session, syncStatus, conflict, resolveConflict, pull, resetAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
