"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/lib/auth";
import { listerEtablissements } from "@/lib/etablissements";
import type { Etablissement } from "@/types";

/** Portée active : un établissement précis, ou "consolide" (cumul, propriétaire seulement). */
export type Selection = number | "consolide";

interface EtablissementContextValue {
  etablissements: Etablissement[];
  selection: Selection;
  setSelection: (s: Selection) => void;
  /** Id d'établissement actif, ou null en vue consolidée. */
  etablissementActifId: number | null;
  chargement: boolean;
  rafraichir: () => Promise<void>;
}

const Ctx = createContext<EtablissementContextValue | undefined>(undefined);

const STORAGE_KEY = "gc_selection";

export function EtablissementProvider({ children }: { children: React.ReactNode }) {
  const { utilisateur, estProprietaire } = useAuth();
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [selection, setSelectionState] = useState<Selection>("consolide");
  const [chargement, setChargement] = useState(true);

  const rafraichir = useCallback(async () => {
    const liste = await listerEtablissements();
    setEtablissements(liste);
    return;
  }, []);

  useEffect(() => {
    if (!utilisateur) return;
    setChargement(true);
    listerEtablissements()
      .then((liste) => {
        setEtablissements(liste);

        const stored = localStorage.getItem(STORAGE_KEY);
        let initial: Selection;
        if (estProprietaire) {
          initial =
            stored === "consolide"
              ? "consolide"
              : stored && liste.some((e) => e.id === Number(stored))
              ? Number(stored)
              : "consolide";
        } else {
          // Un gérant est toujours limité à un établissement précis.
          initial = liste[0]?.id ?? "consolide";
        }
        setSelectionState(initial);
      })
      .finally(() => setChargement(false));
  }, [utilisateur, estProprietaire]);

  const setSelection = useCallback((s: Selection) => {
    setSelectionState(s);
    localStorage.setItem(STORAGE_KEY, String(s));
  }, []);

  const etablissementActifId = selection === "consolide" ? null : selection;

  return (
    <Ctx.Provider
      value={{
        etablissements,
        selection,
        setSelection,
        etablissementActifId,
        chargement,
        rafraichir,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useEtablissement(): EtablissementContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useEtablissement doit être utilisé dans un EtablissementProvider.");
  return ctx;
}
