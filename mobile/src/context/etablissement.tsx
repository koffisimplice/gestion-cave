import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/auth";
import { listerEtablissements } from "@/api/endpoints";
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
  }, []);

  useEffect(() => {
    if (!utilisateur) {
      setEtablissements([]);
      return;
    }
    setChargement(true);
    (async () => {
      try {
        const liste = await listerEtablissements();
        setEtablissements(liste);

        const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
      } finally {
        setChargement(false);
      }
    })();
  }, [utilisateur, estProprietaire]);

  const setSelection = useCallback((s: Selection) => {
    setSelectionState(s);
    AsyncStorage.setItem(STORAGE_KEY, String(s)).catch(() => {});
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
