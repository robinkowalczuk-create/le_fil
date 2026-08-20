import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = chargement
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const action =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error: authError } = await action;
    setLoading(false);
    if (authError) setError(authError.message);
  };

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint">
          Chargement...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-[32px] text-ink mb-1">Le Fil</h1>
          <p className="font-body text-[14px] text-ink-muted mb-8">
            {mode === "signin"
              ? "Reprends le fil de ta vie."
              : "Commence à écrire le fil de ta vie."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-body w-full px-4 py-3 rounded-[3px] bg-paper-card outline-none text-[14px] text-ink placeholder:text-ink-faint"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-body w-full px-4 py-3 rounded-[3px] bg-paper-card outline-none text-[14px] text-ink placeholder:text-ink-faint"
            />

            {error && (
              <p className="font-body text-[12.5px] text-thread">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="font-body w-full py-3 rounded-full bg-thread text-paper text-[13.5px] font-medium disabled:opacity-60"
            >
              {loading
                ? "..."
                : mode === "signin"
                ? "Se connecter"
                : "Créer mon compte"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-mono text-[11px] tracking-wide text-ink-muted mt-5"
          >
            {mode === "signin"
              ? "Pas encore de compte ? Créer un compte"
              : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    );
  }

  return children(session);
}
