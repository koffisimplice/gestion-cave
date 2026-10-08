import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from "@/api/client";
import { getMoi, login as apiLogin } from "@/api/endpoints";
import type { Utilisateur } from "@/types";

interface AuthContextValue {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  estProprietaire: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  // Au démarrage : si un token est stocké, on récupère le profil courant.
  useEffect(() => {
    let actif = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (actif) setChargement(false);
        return;
      }
      try {
        const u = await getMoi();
        if (actif) setUtilisateur(u);
      } catch {
        await clearToken();
      } finally {
        if (actif) setChargement(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  // Déconnexion automatique sur 401 renvoyé par le serveur.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUtilisateur(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await apiLogin(email, motDePasse);
    await setToken(res.token);
    setUtilisateur(res.utilisateur);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUtilisateur(null);
  }, []);

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
