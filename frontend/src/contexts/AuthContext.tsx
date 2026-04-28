import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("grove_token"));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("grove_user");
    try { return stored ? JSON.parse(stored) : null; }
    catch { return null; }
  });

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("grove_token", newToken);
    localStorage.setItem("grove_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("grove_token");
    localStorage.removeItem("grove_user");
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((newUser: User) => {
    localStorage.setItem("grove_user", JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
