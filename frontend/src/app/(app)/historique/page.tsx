"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, Lock } from "lucide-react";
import { useEtablissement } from "@/lib/etablissement-context";
import { getHistorique } from "@/lib/tableau-bord";
import { listerBoissons } from "@/lib/boissons";
import { HttpError } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import type { Boisson, LigneHistorique } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}
function formatDate(s: string): string {
  const [a, m, j] = s.split("-");
  return `${j}/${m}/${a}`;
}

const selectClasses =
  "flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function HistoriquePage() {
  const { etablissementActifId } = useEtablissement();

  const now = new Date();
  const [debut, setDebut] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [fin, setFin] = useState(iso(now));
  const [boissonId, setBoissonId] = useState<string>("");
  const [boissons, setBoissons] = useState<Boisson[]>([]);
  const [lignes, setLignes] = useState<LigneHistorique[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    listerBoissons(etablissementActifId).then(setBoissons).catch(() => setBoissons([]));
    setBoissonId("");
  }, [etablissementActifId]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setLignes(
        await getHistorique(
          debut,
          fin,
          etablissementActifId,
          boissonId ? Number(boissonId) : null
        )
      );
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [debut, fin, etablissementActifId, boissonId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const consolide = !etablissementActifId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique</h1>
        <p className="text-muted-foreground">
          Archive des points journaliers, filtrable par période, boisson et maquis.
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Du</label>
            <Input
              type="date"
              value={debut}
              max={fin}
              onChange={(e) => setDebut(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Au</label>
            <Input
              type="date"
              value={fin}
              min={debut}
              max={iso(new Date())}
              onChange={(e) => setFin(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium">Boisson</label>
            <select
              value={boissonId}
              onChange={(e) => setBoissonId(e.target.value)}
              className={selectClasses}
            >
              <option value="">Toutes les boissons</option>
              {boissons.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.designation}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {erreur && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" /> {erreur}
        </div>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : lignes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun point enregistré sur cette période.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vue cartes — téléphone & tablette portrait */}
          <div className="space-y-3 lg:hidden">
            {lignes.map((l) => (
              <Card key={l.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.designation}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(l.date)}
                        {consolide && ` · ${l.etablissementNom}`}
                      </p>
                    </div>
                    {l.statut === "CLOTURE" ? (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <Lock className="h-3 w-3" /> Clôturé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        Ouvert
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Ancien</p>
                      <p className="tabular-nums">{l.ancienStock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commande</p>
                      <p className="tabular-nums">{l.commandeDuJour}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nouveau</p>
                      <p className="tabular-nums">{l.nouveauStock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Restant</p>
                      <p className="tabular-nums">
                        {l.stockRestant != null ? l.stockRestant : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendu</p>
                      <p className="font-medium tabular-nums">
                        {l.stockVendu != null ? l.stockVendu : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">P.V.T</p>
                      <p className="font-semibold tabular-nums">
                        {l.prixVenteTotal != null ? formatFCFA(l.prixVenteTotal) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vue tableau — ordinateur */}
          <Card className="hidden overflow-hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  {consolide && <th className="px-3 py-3 font-semibold">Maquis</th>}
                  <th className="px-3 py-3 font-semibold">Boisson</th>
                  <th className="px-3 py-3 text-right font-semibold">Ancien</th>
                  <th className="px-3 py-3 text-right font-semibold">Commande</th>
                  <th className="px-3 py-3 text-right font-semibold">Nouveau</th>
                  <th className="px-3 py-3 text-right font-semibold">Restant</th>
                  <th className="px-3 py-3 text-right font-semibold">Vendu</th>
                  <th className="px-3 py-3 text-right font-semibold">P.V.T</th>
                  <th className="px-3 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatDate(l.date)}
                    </td>
                    {consolide && (
                      <td className="px-3 py-2">
                        <Badge variant="outline">{l.etablissementNom}</Badge>
                      </td>
                    )}
                    <td className="px-3 py-2 font-medium">{l.designation}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.ancienStock}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.commandeDuJour}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.nouveauStock}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.stockRestant != null ? l.stockRestant : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {l.stockVendu != null ? l.stockVendu : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {l.prixVenteTotal != null ? formatFCFA(l.prixVenteTotal) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {l.statut === "CLOTURE" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Clôturé
                        </Badge>
                      ) : (
                        <Badge variant="outline">Ouvert</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </>
      )}
    </div>
  );
}
