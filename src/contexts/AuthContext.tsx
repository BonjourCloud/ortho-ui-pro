import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { can as canRole, type Capability, type CmsRole } from "@/lib/permissions";
import { resolveCmsRole, type RoleClient } from "@/lib/resolveCmsRole";
import { canDirectPublish as canDirectPublishFor, type DirectPublishTarget } from "@/lib/cms/directPublish";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "error";

export interface AuthValue {
  status: AuthStatus;
  user: User | null;
  /** Role as reported by the database. null = signed in but no CMS access. */
  role: CmsRole | null;
  roleSource: "rpc" | "legacy" | null;
  editorsCanPublish: boolean;
  /**
   * The signed-in Editor's own `profiles.direct_publish_enabled` flag (migration 007), for display
   * only. The publish functions re-check it in the database at publish time.
   */
  directPublishEnabled: boolean;
  /** True when a signed-in session ended without the user pressing "Sign out". */
  sessionExpired: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  retry: () => void;
  can: (capability: Capability) => boolean;
  /** UX helper: may this user publish this target without review? (database re-checks) */
  canDirectPublish: (target: DirectPublishTarget | string | null | undefined) => boolean;
  /** Re-reads the direct publishing flag (e.g. before showing a publish button). */
  refreshDirectPublish: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Own profile row only (RLS "Users read own profile"). Missing column (007 not applied) → false. */
async function readDirectPublishFlag(userId: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { direct_publish_enabled?: boolean } | null; error: unknown }> } };
      };
    })
      .from("profiles")
      .select("direct_publish_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return false;
    return data.direct_publish_enabled === true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<CmsRole | null>(null);
  const [roleSource, setRoleSource] = useState<"rpc" | "legacy" | null>(null);
  const [editorsCanPublish, setEditorsCanPublish] = useState(false);
  const [directPublishEnabled, setDirectPublishEnabled] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const manualSignOutRef = useRef(false);
  const requestRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);

  const applySession = useCallback(async (session: Session | null) => {
    sessionRef.current = session;
    const request = ++requestRef.current;

    if (!session) {
      const hadUser = userIdRef.current !== null;
      userIdRef.current = null;
      setUser(null);
      setRole(null);
      setRoleSource(null);
      setEditorsCanPublish(false);
      setDirectPublishEnabled(false);
      setError(null);
      if (hadUser && !manualSignOutRef.current) setSessionExpired(true);
      manualSignOutRef.current = false;
      setStatus("unauthenticated");
      return;
    }

    const isNewUser = userIdRef.current !== session.user.id;
    userIdRef.current = session.user.id;
    setSessionExpired(false);
    setUser(session.user);
    if (isNewUser) setStatus("loading"); // avoid flicker on silent token refresh

    try {
      const resolved = await resolveCmsRole(supabase as unknown as RoleClient, session.user.id);
      if (request !== requestRef.current) return; // a newer session event superseded this one

      let publish = false;
      if (resolved.role) {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "editors_can_publish").maybeSingle();
        publish = data?.value === true;
      }
      if (request !== requestRef.current) return;

      const direct = resolved.role === "editor" ? await readDirectPublishFlag(session.user.id) : false;
      if (request !== requestRef.current) return;

      setRole(resolved.role);
      setRoleSource(resolved.source);
      setEditorsCanPublish(publish);
      setDirectPublishEnabled(direct);
      setError(null);
      setStatus("authenticated");
    } catch (e) {
      if (request !== requestRef.current) return;
      setError(e instanceof Error ? e.message : "Could not verify your account.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Subscribe first, then read the stored session. Work is deferred with setTimeout because
    // calling Supabase inside the auth callback can deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void applySession(session), 0);
    });
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    return () => subscription.unsubscribe();
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      // Do not reveal whether the account exists.
      const generic = /invalid login credentials/i.test(signInError.message);
      return { error: generic ? "Invalid email or password." : signInError.message };
    }
    return {};
  }, []);

  const signOut = useCallback(async () => {
    manualSignOutRef.current = true;
    await supabase.auth.signOut();
  }, []);

  const refreshDirectPublish = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || role !== "editor") {
      setDirectPublishEnabled(false);
      return;
    }
    setDirectPublishEnabled(await readDirectPublishFlag(uid));
  }, [role]);

  const retry = useCallback(() => {
    setStatus("loading");
    void applySession(sessionRef.current);
  }, [applySession]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      role,
      roleSource,
      editorsCanPublish,
      directPublishEnabled,
      sessionExpired,
      error,
      signIn,
      signOut,
      retry,
      can: (capability) => canRole(role, capability, { editorsCanPublish }),
      canDirectPublish: (target) => canDirectPublishFor(role, directPublishEnabled, target),
      refreshDirectPublish,
    }),
    [status, user, role, roleSource, editorsCanPublish, directPublishEnabled, sessionExpired, error, signIn, signOut, retry, refreshDirectPublish],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
