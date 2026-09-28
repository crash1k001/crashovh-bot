import { createContext, useContext, useEffect, useState } from "react";
import { api, type Session } from "@/lib/api";

type AuthState = {
  loading: boolean;
  session: Session | null;
  live: boolean; // true if backend answered (even with user:null)
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  loading: true,
  session: null,
  live: false,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [live, setLive] = useState(false);

  const refresh = async () => {
    const { reachable, data } = await api.sessionInfo();
    setLive(reachable);
    setSession(reachable ? data ?? { user: null, isAdmin: false } : null);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async () => {
    await api.logout();
    await refresh();
  };

  return (
    <AuthCtx.Provider value={{ loading, session, live, refresh, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
