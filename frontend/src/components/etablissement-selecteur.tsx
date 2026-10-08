"use client";

import { Store, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement, type Selection } from "@/lib/etablissement-context";

export function EtablissementSelecteur() {
  const { estProprietaire } = useAuth();
  const { etablissements, selection, setSelection, chargement } = useEtablissement();

  if (chargement) {
    return <div className="h-10 w-44 animate-pulse rounded-md bg-muted" />;
  }

  // Un gérant n'a qu'un seul établissement : affichage figé, pas de bascule.
  if (!estProprietaire) {
    const actif = etablissements[0];
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium">
        <Store className="h-4 w-4 text-primary" />
        {actif?.nom ?? "—"}
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {selection === "consolide" ? (
          <Layers className="h-4 w-4" />
        ) : (
          <Store className="h-4 w-4" />
        )}
      </span>
      <select
        aria-label="Choisir l'établissement"
        className="h-10 w-full min-w-[12rem] cursor-pointer rounded-md border border-input bg-card pl-9 pr-8 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={String(selection)}
        onChange={(e) => {
          const v = e.target.value;
          const next: Selection = v === "consolide" ? "consolide" : Number(v);
          setSelection(next);
        }}
      >
        <option value="consolide">Vue consolidée (tous)</option>
        {etablissements.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
