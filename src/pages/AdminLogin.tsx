import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, UserPlus } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { adminLogin, isAdmin, isAuthLoading } = useSiteConfig();
  const navigate = useNavigate();

  if (isAuthLoading) {
    return (
      <section className="py-20 md:py-32 flex justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </section>
    );
  }

  if (isAdmin) {
    navigate("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        // After signup, call the assign-admin-role edge function
        const { error: roleError } = await supabase.functions.invoke("assign-admin-role", {
          body: { email },
        });
        if (roleError) {
          setInfo("Account created! But admin role could not be assigned automatically. Contact support.");
        } else {
          setInfo("Account created with admin role! You can now sign in.");
          setMode("login");
        }
      }
    } else {
      const result = await adminLogin(email, password);
      if (!result.success) {
        setError(result.error || "Login failed");
      } else {
        // Small delay to let onAuthStateChange update isAdmin
        setTimeout(() => navigate("/admin"), 500);
      }
    }
    setLoading(false);
  };

  return (
    <section className="py-20 md:py-32">
      <div className="container max-w-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {mode === "login" ? <Lock className="text-primary" size={28} /> : <UserPlus className="text-primary" size={28} />}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "login" ? "Admin Login" : "Admin Sign Up"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Access the dashboard" : "Create your admin account"}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">{error}</div>}
          {info && <div className="bg-primary/10 text-primary text-sm rounded-lg p-3">{info}</div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin" size={16} />}
            {mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            className="text-sm text-primary hover:underline">
            {mode === "login" ? "Need an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </section>
  );
}
