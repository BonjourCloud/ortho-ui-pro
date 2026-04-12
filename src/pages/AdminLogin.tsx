import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, UserPlus, KeyRound } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [signupEnabled, setSignupEnabled] = useState(false);

  const { adminLogin, isAdmin, isAuthLoading } = useSiteConfig();
  const navigate = useNavigate();

  // Fetch signup toggle
  useEffect(() => {
    const fetchSignupSetting = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "signup_enabled")
        .single();

      if (data) {
        setSignupEnabled(data.value === true);
      }
    };

    fetchSignupSetting();
  }, []);

  // ✅ SAFE redirect (only after render)
  useEffect(() => {
    if (!isAuthLoading && isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, isAuthLoading, navigate]);

  // Loading state
  if (isAuthLoading) {
    return (
      <section className="py-20 md:py-32 flex justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </section>
    );
  }

  // Prevent rendering login if already admin
  if (isAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });

        if (resetError) {
          setError(resetError.message);
        } else {
          setInfo("Password reset email sent! Check your inbox.");
        }
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          await supabase.functions.invoke("assign-admin-role", {
            body: { email },
          });

          setInfo("Account created! You can now sign in.");
          setMode("login");
        }
        return;
      }

      // LOGIN FLOW
      const result = await adminLogin(email, password);

      if (!result.success) {
        setError(result.error || "Login failed");
      }
      // ✅ NO navigate here (handled by useEffect)

    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const icons = { login: Lock, signup: UserPlus, forgot: KeyRound };
  const titles = {
    login: "Admin Login",
    signup: "Admin Sign Up",
    forgot: "Reset Password",
  };
  const subtitles = {
    login: "Access the dashboard",
    signup: "Create your admin account",
    forgot: "Enter your email to receive a reset link",
  };
  const buttonLabels = {
    login: "Sign In",
    signup: "Sign Up",
    forgot: "Send Reset Link",
  };

  const Icon = icons[mode];

  return (
    <section className="py-20 md:py-32">
      <div className="container max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon className="text-primary" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {titles[mode]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitles[mode]}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-primary/10 text-primary text-sm rounded-lg p-3">
              {info}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {buttonLabels[mode]}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === "login" && (
            <>
              <button
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setInfo("");
                }}
                className="text-sm text-muted-foreground hover:text-primary hover:underline block mx-auto"
              >
                Forgot password?
              </button>

              {signupEnabled && (
                <button
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setInfo("");
                  }}
                  className="text-sm text-primary hover:underline block mx-auto"
                >
                  Need an account? Sign Up
                </button>
              )}
            </>
          )}

          {mode === "signup" && (
            <button
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className="text-sm text-primary hover:underline"
            >
              Already have an account? Sign In
            </button>
          )}

          {mode === "forgot" && (
            <button
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
              }}
              className="text-sm text-primary hover:underline"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </section>
  );
}