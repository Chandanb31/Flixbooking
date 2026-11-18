import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, hasToken, setToken } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";

interface AuthState {
  user: User | null;
  ready: boolean; // false while we check a saved login on page load
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!hasToken());

  useEffect(() => {
    if (!hasToken()) return;
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const finish = (res: AuthResponse) => {
    setToken(res.access_token);
    setUser(res.user);
  };

  const value: AuthState = {
    user,
    ready,
    login: async (email, password) => finish(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } })),
    register: async (data) => finish(await api<AuthResponse>("/auth/register", { method: "POST", body: data })),
    logout: () => {
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
