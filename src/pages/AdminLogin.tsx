import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { KeyRound, Loader2, Lock, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AccessDenied } from "@/components/admin/states";

type Mode = "login" | "signup" | "forgot";

const ICONS = { login: Lock, signup: UserPlus, forgot: KeyRound };
const TITLES = { login: "Sign in", signup: "Create account", forgot: "Reset password" };
const SUBTITLES = { login: "OrthoCare Hub content manager", signup: "Create your admin account", forgot: "Enter your email to receive a reset link" };
const BUTTONS = { login: "Sign in", signup: "Sign up", forgot: "Send reset link" };

const inputClass = "w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminLogin() {
  const { status, role, signIn, signOut, sessionExpired } = useAuth();
  const location = useLocation();
  const navState = location.state as { from?: string; expired?: boolean } | null;
  const from = navState?.from && navState.from.startsWith("/admin") && navState.from !== "/admin/login" ? navState.from : "/admin";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(navState?.expired || sessionExpired ? "Your session has ended. Please sign in again." : "");
  const [loading, setLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(false);

  // Existing behaviour: signup link appears only if the signup_enabled app setting is on.
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "signup_enabled")
      .maybeSingle()
      .then(({ data }) => setSignupEnabled(data?.value === true));
  }, []);

  if (status === "loading") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} aria-label="Loading" />
      </div>
    );
  }

  if (status === "authenticated") {
    if (role) return <Navigate to={from} replace />;
    return <AccessDenied variant="no-role" onSignOut={() => void signOut()} />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (resetError) setError(resetError.message);
        else setInfo("If that email has an account, a reset link has been sent.");
        return;
      }
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin/login` } });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          // Existing bootstrap path (edge function restricted to the designated admin email). Will be replaced by Super Admin user provisioning.
          await supabase.functions.invoke("assign-admin-role", { body: { email } });
          setInfo("Account created. If email confirmation is on, confirm your email, then sign in.");
          setMode("login");
        }
        return;
      }
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
      // On success AuthContext updates and this component redirects.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const Icon = ICONS[mode];

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-10 font-body">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon className="text-primary" size={26} aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">{TITLES[mode]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{SUBTITLES[mode]}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div role="status" className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
              {info}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input id="login-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
            {BUTTONS[mode]}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => switchMode("forgot")} className="block w-full text-muted-foreground hover:text-primary hover:underline">
                Forgot password?
              </button>
              {signupEnabled && (
                <button type="button" onClick={() => switchMode("signup")} className="block w-full text-primary hover:underline">
                  Need an account? Sign up
                </button>
              )}
            </>
          )}
          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")} className="text-primary hover:underline">
              Back to sign in
            </button>
          )}
          <Link to="/" className="block pt-2 text-xs text-muted-foreground hover:text-primary">
            ← Back to website
          </Link>
        </div>
      </div>
    </main>
  );
}
