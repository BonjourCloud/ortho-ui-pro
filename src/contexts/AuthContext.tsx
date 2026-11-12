import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { can as canRole, type Capability, type CmsRole } from "@/lib/permissions";
import { resolveCmsRole, type RoleClient } from "@/lib/resolveCmsRole";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated" | "error";

export interface AuthValue {
  status: AuthStatus;
  user: User | null;
  /** Role as reported by the database. null = signed in but no CMS access. */
  role: CmsRole | null;
  roleSource: "rpc" | "legacy" | null;
  editorsCanPublish: boolean;
  /** True when a signed-in session ended without the user pressing "Sign out". */
  sessionExpired: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  retry: () => void;
  can: (capability: Capability) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<CmsRole | null>(null);
  const [roleSource, setRoleSource] = useState<"rpc" | "legacy" | null>(null);
  const [editorsCanPublish, setEditorsCanPublish] = useState(false);
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

      setRole(resolved.role);
      setRoleSource(resolved.source);
      setEditorsCanPublish(publish);
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
      sessionExpired,
      error,
      signIn,
      signOut,
      retry,
      can: (capability) => canRole(role, capability, { editorsCanPublish }),
    }),
    [status, user, role, roleSource, editorsCanPublish, sessionExpired, error, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
