"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  Lock,
  Banknote,
  TrendingUp,
  TrendingDown,
  Boxes,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import { analyserMarges } from "@/lib/analyse";
import { HttpError } from "@/lib/api";
import { formatFCFA, formatNombre } from "@/lib/utils";
import type { AnalyseMarge } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Preset = "jour" | "semaine" | "mois" | "perso";

function bornesPreset(p: Preset): { debut: string; fin: string } {
  const now = new Date();
  const fin = iso(now);
  if (p === "jour") return { debut: fin, fin };
  if (p === "semaine") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { debut: iso(d), fin };
  }
  // mois : du 1er du mois courant à aujourd'hui
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return { debut: iso(d), fin };
}

export default function MargesPage() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();

  const [preset, setPreset] = useState<Preset>("mois");
  const [debut, setDebut] = useState(() => bornesPreset("mois").debut);
  const [fin, setFin] = useState(() => bornesPreset("mois").fin);
  const [analyse, setAnalyse] = useState<AnalyseMarge | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisirPreset(p: Preset) {
    setPreset(p);
    if (p !== "perso") {
      const b = bornesPreset(p);
      setDebut(b.debut);
      setFin(b.fin);
    }
  }

  const charger = useCallback(async () => {
    if (!estProprietaire) return;
    setChargement(true);
    setErreur(null);
    try {
      setAnalyse(await analyserMarges(debut, fin, etablissementActifId));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [debut, fin, etablissementActifId, estProprietaire]);

  useEffect(() => {
    charger();
  }, [charger]);

  const nomPerimetre = useMemo(() => {
    if (!etablissementActifId) return "Vue consolidée (tous les maquis)";
    return etablissements.find((e) => e.id === etablissementActifId)?.nom ?? "";
  }, [etablissementActifId, etablissements]);

  if (!estProprietaire) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
          <Lock className="h-5 w-5 shrink-0" />
          Cette page est réservée au propriétaire.
        </CardContent>
      </Card>
    );
  }

  const beneficiaire = (analyse?.beneficeBrut ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marges &amp; bénéfices</h1>
        <p className="text-muted-foreground">{nomPerimetre}</p>
      </div>

      {/* Sélection de période */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["jour", "Aujourd’hui"],
                ["semaine", "7 derniers jours"],
                ["mois", "Ce mois-ci"],
                ["perso", "Personnalisé"],
              ] as [Preset, string][]
            ).map(([p, label]) => (
              <Button
                key={p}
                variant={preset === p ? "default" : "outline"}
                size="sm"
                onClick={() => choisirPreset(p)}
              >
                {label}
              </Button>
            ))}
          </div>
          {preset === "perso" && (
            <div className="flex flex-wrap items-end gap-3">
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
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Période analysée : du {formatDate(debut)} au {formatDate(fin)}.
          </p>
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
      ) : !analyse ? null : (
        <>
          {/* Cartes de synthèse */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titre="Chiffre d’affaires"
              valeur={formatFCFA(analyse.chiffreAffaires)}
              icone={<Banknote className="h-5 w-5" />}
            />
            <Kpi
              titre="Bénéfice brut"
              valeur={formatFCFA(analyse.beneficeBrut)}
              icone={
                beneficiaire ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              accent={beneficiaire ? "success" : "destructive"}
            />
            <Kpi
              titre="Quantité vendue"
              valeur={`${formatNombre(analyse.totalQuantiteVendue)} btl`}
              icone={<ShoppingBag className="h-5 w-5" />}
            />
            <Kpi
              titre="Valeur du stock restant"
              valeur={formatFCFA(analyse.valorisationStockRevient)}
              sousTitre={`Au prix de vente : ${formatFCFA(analyse.valorisationStockVente)}`}
              icone={<Boxes className="h-5 w-5" />}
            />
          </div>

          {/* Tableau par boisson */}
          {analyse.lignes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune vente ni stock sur cette période.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Vue cartes — téléphone & tablette portrait */}
              <div className="space-y-3 lg:hidden">
                {analyse.lignes.map((l) => (
                  <Card key={l.boissonId}>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-semibold">{l.designation}</p>
                        <p
                          className={`shrink-0 text-right font-semibold tabular-nums ${
                            l.benefice < 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {formatFCFA(l.benefice)}
                          <span className="block text-xs font-normal text-muted-foreground">
                            bénéfice
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Vendu</p>
                          <p className="tabular-nums">{formatNombre(l.quantiteVendue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">C.A.</p>
                          <p className="tabular-nums">{formatFCFA(l.chiffreAffaires)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revient / u</p>
                          <p className="tabular-nums text-muted-foreground">
                            {formatFCFA(l.prixRevientUnitaire)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Marge / u</p>
                          <p
                            className={`tabular-nums ${
                              l.margeUnitaire < 0 ? "text-destructive" : ""
                            }`}
                          >
                            {formatFCFA(l.margeUnitaire)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Stock restant</p>
                          <p className="tabular-nums">{formatNombre(l.stockRestant)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Valeur stock</p>
                          <p className="tabular-nums text-muted-foreground">
                            {formatFCFA(l.valorisationStockRevient)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold">
                  <span>Total — {formatNombre(analyse.totalQuantiteVendue)} btl</span>
                  <span className="tabular-nums">{formatFCFA(analyse.chiffreAffaires)}</span>
                  <span
                    className={`tabular-nums ${
                      beneficiaire ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatFCFA(analyse.beneficeBrut)}
                  </span>
                </div>
              </div>

              {/* Vue tableau — ordinateur */}
              <Card className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th className="sticky left-0 z-10 bg-secondary px-3 py-3 font-semibold">
                        Boisson
                      </th>
                      <th className="px-3 py-3 text-right font-semibold">Vendu</th>
                      <th className="px-3 py-3 text-right font-semibold">C.A.</th>
                      <th className="px-3 py-3 text-right font-semibold">Revient</th>
                      <th className="px-3 py-3 text-right font-semibold">Marge/u</th>
                      <th className="px-3 py-3 text-right font-semibold">Bénéfice</th>
                      <th className="px-3 py-3 text-right font-semibold">Stock</th>
                      <th className="px-3 py-3 text-right font-semibold">Valeur stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyse.lignes.map((l) => (
                      <tr key={l.boissonId} className="border-b border-border">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">
                          {l.designation}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatNombre(l.quantiteVendue)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatFCFA(l.chiffreAffaires)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatFCFA(l.prixRevientUnitaire)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            l.margeUnitaire < 0 ? "text-destructive" : ""
                          }`}
                        >
                          {formatFCFA(l.margeUnitaire)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-semibold tabular-nums ${
                            l.benefice < 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {formatFCFA(l.benefice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatNombre(l.stockRestant)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {formatFCFA(l.valorisationStockRevient)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary font-semibold">
                      <td className="sticky left-0 z-10 bg-secondary px-3 py-3">Total</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatNombre(analyse.totalQuantiteVendue)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatFCFA(analyse.chiffreAffaires)}
                      </td>
                      <td colSpan={2}></td>
                      <td
                        className={`px-3 py-3 text-right tabular-nums ${
                          beneficiaire ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatFCFA(analyse.beneficeBrut)}
                      </td>
                      <td></td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatFCFA(analyse.valorisationStockRevient)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  titre,
  valeur,
  sousTitre,
  icone,
  accent,
}: {
  titre: string;
  valeur: string;
  sousTitre?: string;
  icone: React.ReactNode;
  accent?: "success" | "destructive";
}) {
  const couleur =
    accent === "success"
      ? "text-success"
      : accent === "destructive"
      ? "text-destructive"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">{titre}</span>
          {icone}
        </div>
        <p className={`text-2xl font-bold tabular-nums ${couleur}`}>{valeur}</p>
        {sousTitre && <p className="text-xs text-muted-foreground">{sousTitre}</p>}
      </CardContent>
    </Card>
  );
}
