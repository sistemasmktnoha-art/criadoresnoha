import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });
const SESSION_RETRY_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAuthError(err: unknown) {
  const message = String((err as any)?.message || "").toLowerCase();
  return /failed to fetch|timeout|network|connection terminated|5\d\d|request_timeout|fetch/i.test(message);
}

async function getSessionWithRetry() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < SESSION_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await supabase.auth.getSession();

    if (!error) return data.session;

    lastError = error;
    if (!isTransientAuthError(error) || attempt === SESSION_RETRY_ATTEMPTS - 1) {
      throw error;
    }

    await sleep(1000 * Math.pow(2, attempt));
  }

  throw lastError;
}

export function useAuth() {
  return useContext(AuthContext);
}

// "Permanecer conectado": when unchecked, the session only lasts while the
// browser session is alive (sessionStorage marker), otherwise it persists.
const REMEMBER_KEY = "noha-remember-me";
const SESSION_MARKER = "noha-session-active";

export function setRememberPreference(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    sessionStorage.setItem(SESSION_MARKER, "1");
  } catch { /* storage unavailable */ }
}

function shouldDropSession() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "0" && sessionStorage.getItem(SESSION_MARKER) !== "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const loadInitialSession = async () => {
      try {
        if (shouldDropSession()) {
          await supabase.auth.signOut({ scope: "local" });
        }
        const session = await getSessionWithRetry();
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.warn("Falha ao carregar sessão inicial:", error);
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
