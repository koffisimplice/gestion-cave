"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { listerAudit } from "@/lib/audit";
import { HttpError } from "@/lib/api";
import type { JournalAudit } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Variante = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

const ACTIONS: Record<string, { label: string; variant: Variante }> = {
  CONNEXION: { label: "Connexion", variant: "success" },
  CONNEXION_ECHOUEE: { label: "Échec de connexion", variant: "warning" },
  CONNEXION_BLOQUEE: { label: "Blocage (force brute)", variant: "destructive" },
  UTILISATEUR_CREE: { label: "Utilisateur créé", variant: "default" },
  UTILISATEUR_MODIFIE: { label: "Utilisateur modifié", variant: "secondary" },
  UTILISATEUR_ACTIVE: { label: "Compte activé", variant: "success" },
  UTILISATEUR_DESACTIVE: { label: "Compte désactivé", variant: "warning" },
  FOURNISSEUR_CREE: { label: "Fournisseur créé", variant: "default" },
  FOURNISSEUR_MODIFIE: { label: "Fournisseur modifié", variant: "secondary" },
  FOURNISSEUR_DESACTIVE: { label: "Fournisseur désactivé", variant: "warning" },
  FOURNISSEUR_SUPPRIME: { label: "Fournisseur supprimé", variant: "destructive" },
  EMPLOYE_CREE: { label: "Employé créé", variant: "default" },
  EMPLOYE_MODIFIE: { label: "Employé modifié", variant: "secondary" },
  EMPLOYE_DESACTIVE: { label: "Employé désactivé", variant: "warning" },
  EMPLOYE_SUPPRIME: { label: "Employé supprimé", variant: "destructive" },
  SALAIRE_PAYE: { label: "Salaire payé", variant: "success" },
  SALAIRE_ANNULE: { label: "Paiement annulé", variant: "warning" },
};

function metaAction(code: string): { label: string; variant: Variante } {
  return ACTIONS[code] ?? { label: code, variant: "secondary" };
}

function formatDateHeure(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditPage() {
  const [entrees, setEntrees] = useState<JournalAudit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("");

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setEntrees(await listerAudit(filtre || undefined));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [filtre]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" /> Journal d’audit
          </h1>
          <p className="text-muted-foreground">
            Traçabilité des actions sensibles : connexions, comptes, fournisseurs.
          </p>
        </div>
        <div>
          <label htmlFor="filtre" className="mb-1 block text-sm font-medium">
            Filtrer par action
          </label>
          <select
            id="filtre"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            className="flex h-11 w-64 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Toutes les actions</option>
            {Object.entries(ACTIONS).map(([code, m]) => (
              <option key={code} value={code}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erreur && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" /> {erreur}
        </div>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : entrees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune entrée pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vue cartes — téléphone & tablette portrait */}
          <div className="space-y-3 lg:hidden">
            {entrees.map((e) => {
              const m = metaAction(e.action);
              return (
                <Card key={e.id}>
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={m.variant} className="shrink-0">
                        {m.label}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDateHeure(e.dateHeure)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{e.acteur}</p>
                    {e.cible && (
                      <p className="text-sm text-muted-foreground">
                        Cible : {e.cible}
                      </p>
                    )}
                    {e.details && (
                      <p className="text-sm text-muted-foreground">{e.details}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Vue tableau — ordinateur */}
          <Card className="hidden overflow-hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-3 py-3 font-semibold">Date / heure</th>
                  <th className="px-3 py-3 font-semibold">Acteur</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 font-semibold">Cible</th>
                  <th className="px-3 py-3 font-semibold">Détails</th>
                </tr>
              </thead>
              <tbody>
                {entrees.map((e) => {
                  const m = metaAction(e.action);
                  return (
                    <tr key={e.id} className="border-b border-border">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                        {formatDateHeure(e.dateHeure)}
                      </td>
                      <td className="px-3 py-2 font-medium">{e.acteur}</td>
                      <td className="px-3 py-2">
                        <Badge variant={m.variant}>{m.label}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.cible ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.details ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}
    </div>
  );
}
