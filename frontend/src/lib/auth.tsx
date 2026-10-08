"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setToken, clearToken, getToken } from "@/lib/api";
import type { LoginResponse, Utilisateur } from "@/types";

interface AuthContextValue {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  estProprietaire: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChargement(false);
      return;
    }
    apiFetch<Utilisateur>("/api/auth/me")
      .then(setUtilisateur)
      .catch(() => clearToken())
      .finally(() => setChargement(false));
  }, []);

  const login = useCallback(
    async (email: string, motDePasse: string) => {
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email, motDePasse },
      });
      setToken(res.token);
      setUtilisateur(res.utilisateur);
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setUtilisateur(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        utilisateur,
        chargement,
        estProprietaire: utilisateur?.role === "PROPRIETAIRE",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider.");
  return ctx;
}
