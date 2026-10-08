"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  Banknote,
  ShoppingBag,
  Boxes,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  FileSpreadsheet,
  Trophy,
  XCircle,
  LineChart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import { getSynthese, getTendance, telechargerRapport } from "@/lib/tableau-bord";
import { HttpError } from "@/lib/api";
import { formatFCFA, formatNombre } from "@/lib/utils";
import type { PointVenteJour, TableauBord } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraphiqueVentes } from "@/components/charts/graphique-ventes";
import { GraphiqueBarresBoissons } from "@/components/charts/graphique-barres-boissons";

export default function TableauDeBordPage() {
  const { utilisateur, estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();

  const [tb, setTb] = useState<TableauBord | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState<"pdf" | "excel" | null>(null);

  const [tendance, setTendance] = useState<PointVenteJour[]>([]);
  const [jours, setJours] = useState(30);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setTb(await getSynthese(etablissementActifId));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    let annule = false;
    getTendance(etablissementActifId, jours)
      .then((pts) => {
        if (!annule) setTendance(pts);
      })
      .catch(() => {
        if (!annule) setTendance([]);
      });
    return () => {
      annule = true;
    };
  }, [etablissementActifId, jours]);

  async function exporter(format: "pdf" | "excel") {
    if (!tb) return;
    setTelechargement(format);
    setErreur(null);
    try {
      await telechargerRapport(format, tb.annee, tb.mois, etablissementActifId);
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Le téléchargement a échoué.");
    } finally {
      setTelechargement(null);
    }
  }

  if (!utilisateur) return null;

  const nomPerimetre = !etablissementActifId
    ? "Vue consolidée (tous les maquis)"
    : etablissements.find((e) => e.id === etablissementActifId)?.nom ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bonjour {utilisateur.nom} 👋</h1>
          <p className="text-muted-foreground">{nomPerimetre}</p>
        </div>
        {estProprietaire && tb && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exporter("pdf")}
              disabled={telechargement !== null}
            >
              {telechargement === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exporter("excel")}
              disabled={telechargement !== null}
            >
              {telechargement === "excel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </Button>
          </div>
        )}
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
      ) : !tb ? null : (
        <>
          {/* Opérationnel */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titre="Ventes du jour"
              valeur={formatFCFA(tb.ventesDuJour.chiffreAffaires)}
              sousTitre={`${formatNombre(tb.ventesDuJour.quantite)} bouteilles`}
              icone={<ShoppingBag className="h-5 w-5" />}
            />
            <Kpi
              titre="Ventes du mois"
              valeur={formatFCFA(tb.ventesDuMois.chiffreAffaires)}
              sousTitre={`${formatNombre(tb.ventesDuMois.quantite)} bouteilles`}
              icone={<Banknote className="h-5 w-5" />}
            />
            <Kpi
              titre="Stock total"
              valeur={`${formatNombre(tb.stockTotal)} btl`}
              sousTitre={`${tb.nbBoissons} boisson(s)`}
              icone={<Boxes className="h-5 w-5" />}
            />
            <AlertesCard nbStockBas={tb.nbStockBas} nbRuptures={tb.nbRuptures} />
          </div>

          {/* Financier (propriétaire uniquement) */}
          {estProprietaire && tb.beneficeNetMois != null && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Kpi
                titre="Bénéfice brut (mois)"
                valeur={formatFCFA(tb.beneficeBrutMois ?? 0)}
                icone={<TrendingUp className="h-5 w-5" />}
              />
              <Kpi
                titre="Charges (mois)"
                valeur={formatFCFA(tb.totalChargesMois ?? 0)}
                icone={<Wallet className="h-5 w-5" />}
              />
              <Kpi
                titre="Bénéfice net (mois)"
                valeur={formatFCFA(tb.beneficeNetMois)}
                sousTitre={tb.beneficiaire ? "Bénéficiaire" : "Déficitaire"}
                icone={
                  tb.beneficiaire ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )
                }
                accent={tb.beneficiaire ? "success" : "destructive"}
              />
            </div>
          )}

          {/* Courbe de tendance des ventes */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">
                    Chiffre d’affaires — {jours} derniers jours
                  </h2>
                </div>
                <div className="flex gap-1 rounded-md bg-secondary p-1">
                  {[7, 30, 90].map((j) => (
                    <button
                      key={j}
                      onClick={() => setJours(j)}
                      className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                        jours === j
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {j} j
                    </button>
                  ))}
                </div>
              </div>
              {tendance.length === 0 ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <GraphiqueVentes points={tendance} />
              )}
            </CardContent>
          </Card>

          {/* Meilleures ventes */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold">Meilleures ventes du mois</h2>
              </div>
              {tb.meilleuresVentes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucune vente enregistrée ce mois-ci.
                </p>
              ) : (
                <GraphiqueBarresBoissons boissons={tb.meilleuresVentes} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AlertesCard({ nbStockBas, nbRuptures }: { nbStockBas: number; nbRuptures: number }) {
  const ok = nbStockBas === 0 && nbRuptures === 0;
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">Alertes stock</span>
          <AlertTriangle className="h-5 w-5" />
        </div>
        {ok ? (
          <p className="text-2xl font-bold text-success">Aucune</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {nbRuptures > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> {nbRuptures} rupture(s)
              </Badge>
            )}
            {nbStockBas > 0 && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {nbStockBas} stock bas
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
