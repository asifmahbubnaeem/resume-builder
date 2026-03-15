"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type User = { id: string; email: string; subscription: string } | null;

const AuthContext = createContext<{
  user: User;
  token: string | null;
  setUser: (u: User) => void;
  setToken: (t: string | null) => void;
  logout: () => void;
}>({
  user: null,
  token: null,
  setUser: () => {},
  setToken: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => u && setUser({ id: u.id, email: u.email, subscription: u.subscription }))
        .catch(() => localStorage.removeItem("token"));
    }
    setMounted(true);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, logout }}>
      {mounted ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
