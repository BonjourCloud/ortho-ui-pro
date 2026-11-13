import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isExpiredLinkError, parseAuthLinkParams } from "@/lib/authLinkParams";

// supabase-js clears the URL hash once it has read the tokens, so take a snapshot of the link type
// as early as possible (flags only — no tokens are read here).
const INITIAL_LINK =
  typeof window !== "undefined"
    ? parseAuthLinkParams(window.location.search, window.location.hash)
    : { kind: null, errorCode: null, errorDescription: null };

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const current = parseAuthLinkParams(window.location.search, window.location.hash);
    const kind = INITIAL_LINK.kind ?? current.kind;
    const errorCode = INITIAL_LINK.errorCode ?? current.errorCode;

    if (errorCode) {
      setLinkError(
        isExpiredLinkError(errorCode)
          ? "expired"
          : INITIAL_LINK.errorDescription ?? current.errorDescription ?? "This link is not valid.",
      );
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
      // An invitation link signs the user in; they then choose their own password here.
      if (kind === "invite" && session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setIsInvite(true);
      }
    });

    if (kind === "recovery") {
      setIsRecovery(true);
    }
    if (kind === "invite") {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) setIsInvite(true);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate(isInvite ? "/admin" : "/admin/login"), 3000);
    }
    setLoading(false);
  };

  if (linkError && !isRecovery && !isInvite) {
    const expired = linkError === "expired";
    return (
      <section className="py-20 md:py-32">
        <div className="container max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-destructive" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            {expired ? "This link has expired" : "This link cannot be used"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {expired
              ? "Links can be used once and expire after a set time. If this was an invitation, ask your Super Admin to resend it. If you were resetting your password, request a new link from the sign-in page."
              : linkError}
          </p>
          <button onClick={() => navigate("/admin/login")} className="text-sm text-primary hover:underline">
            Back to Login
          </button>
        </div>
      </section>
    );
  }

  if (!isRecovery && !isInvite) {
    return (
      <section className="py-20 md:py-32">
        <div className="container max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-destructive" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This page can only be accessed via a password reset email link.
          </p>
          <button onClick={() => navigate("/admin/login")}
            className="text-sm text-primary hover:underline">
            Back to Login
          </button>
        </div>
      </section>
    );
  }

  if (success) {
    return (
      <section className="py-20 md:py-32">
        <div className="container max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-primary" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">{isInvite ? "Password Created!" : "Password Updated!"}</h1>
          <p className="text-sm text-muted-foreground">
            {isInvite ? "Opening the CMS… Next time, sign in with your email and this password." : "Redirecting to login..."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-32">
      <div className="container max-w-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-primary" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isInvite ? "Welcome to OrthoCare Hub CMS" : "Set New Password"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isInvite
              ? `Create your password (at least ${MIN_PASSWORD_LENGTH} characters) to finish setting up your account.`
              : "Enter your new password below"}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
            <input type="password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
            <input type="password" required minLength={MIN_PASSWORD_LENGTH} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin" size={16} />}
            {isInvite ? "Create Password" : "Update Password"}
          </button>
        </form>
      </div>
    </section>
  );
}
