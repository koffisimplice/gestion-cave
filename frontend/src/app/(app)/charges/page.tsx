"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Banknote,
  TrendingUp,
  Wallet,
  Target,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  getRentabilite,
  creerCharge,
  modifierCharge,
  supprimerCharge,
} from "@/lib/charges";
import { HttpError } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import type {
  CategorieCharge,
  Charge,
  Periodicite,
  Rentabilite,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const CATEGORIES: { value: CategorieCharge; label: string }[] = [
  { value: "VARIABLE", label: "Variable" },
  { value: "FIXE", label: "Fixe" },
  { value: "OBLIGATOIRE", label: "Obligatoire" },
];

const PERIODICITES: { value: Periodicite; label: string }[] = [
  { value: "PONCTUELLE", label: "Ponctuelle" },
  { value: "HEBDOMADAIRE", label: "Hebdomadaire" },
  { value: "MENSUELLE", label: "Mensuelle" },
  { value: "TRIMESTRIELLE", label: "Trimestrielle" },
  { value: "ANNUELLE", label: "Annuelle" },
];

const selectClasses =
  "flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function labelCategorie(c: CategorieCharge) {
  if (c === "SALAIRE") return "Salaire";
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
function labelPeriodicite(p: Periodicite) {
  return PERIODICITES.find((x) => x.value === p)?.label ?? p;
}

export default function ChargesPage() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();

  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [rentabilite, setRentabilite] = useState<Rentabilite | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Charge | null>(null);

  const charger = useCallback(async () => {
    if (!estProprietaire) return;
    setChargement(true);
    setErreur(null);
    try {
      setRentabilite(await getRentabilite(annee, mois, etablissementActifId));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [annee, mois, etablissementActifId, estProprietaire]);

  useEffect(() => {
    charger();
  }, [charger]);

  function ouvrirCreation() {
    setEnEdition(null);
    setDialogOuvert(true);
  }
  function ouvrirEdition(c: Charge) {
    setEnEdition(c);
    setDialogOuvert(true);
  }
  async function supprimer(c: Charge) {
    if (!confirm(`Supprimer la charge « ${c.libelle} » (${formatFCFA(c.montant)}) ?`)) return;
    setSucces(null);
    try {
      await supprimerCharge(c.id);
      setSucces("Charge supprimée.");
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Suppression impossible.");
    }
  }

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

  const annees = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const nomPerimetre = !etablissementActifId
    ? "Vue consolidée (tous les maquis)"
    : etablissements.find((e) => e.id === etablissementActifId)?.nom ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Charges &amp; rentabilité</h1>
          <p className="text-muted-foreground">{nomPerimetre}</p>
        </div>
        {etablissementActifId && (
          <Button size="lg" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" /> Nouvelle charge
          </Button>
        )}
      </div>

      {/* Sélecteur de mois */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Mois</label>
            <select
              value={mois}
              onChange={(e) => setMois(Number(e.target.value))}
              className={`${selectClasses} w-44`}
            >
              {MOIS.map((nom, i) => (
                <option key={i} value={i + 1}>
                  {nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Année</label>
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className={`${selectClasses} w-32`}
            >
              {annees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {succes && (
        <div className="flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> {succes}
        </div>
      )}
      {erreur && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" /> {erreur}
        </div>
      )}
      {!etablissementActifId && (
        <div className="flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" /> Sélectionnez un maquis précis dans l’en-tête pour
          ajouter une charge. La vue consolidée cumule les charges des deux maquis.
        </div>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !rentabilite ? null : (
        <>
          {/* Bandeau bénéfice net */}
          <BandeauResultat r={rentabilite} />

          {/* Cartes de synthèse */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              titre="Chiffre d’affaires"
              valeur={formatFCFA(rentabilite.chiffreAffaires)}
              icone={<Banknote className="h-5 w-5" />}
            />
            <Kpi
              titre="Bénéfice brut"
              valeur={formatFCFA(rentabilite.beneficeBrut)}
              icone={<TrendingUp className="h-5 w-5" />}
            />
            <Kpi
              titre="Total des charges"
              valeur={formatFCFA(rentabilite.totalCharges)}
              icone={<Wallet className="h-5 w-5" />}
            />
            <Kpi
              titre="Seuil de rentabilité"
              valeur={
                rentabilite.chiffreAffairesSeuil != null
                  ? formatFCFA(rentabilite.chiffreAffairesSeuil)
                  : "—"
              }
              sousTitre={
                rentabilite.chiffreAffairesSeuil != null
                  ? "C.A. à atteindre pour couvrir les charges"
                  : "Marge insuffisante pour l’estimer"
              }
              icone={<Target className="h-5 w-5" />}
            />
          </div>

          {/* Répartition par catégorie */}
          {rentabilite.totalCharges > 0 && (
            <div className="flex flex-wrap gap-2">
              {rentabilite.chargesParCategorie
                .filter((c) => c.montant > 0)
                .map((c) => (
                  <Badge key={c.categorie} variant="secondary" className="gap-1 py-1.5 text-sm">
                    {labelCategorie(c.categorie)} : {formatFCFA(c.montant)}
                  </Badge>
                ))}
            </div>
          )}

          {/* Liste des charges */}
          {rentabilite.charges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucune charge saisie pour {MOIS[mois - 1]} {annee}.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Vue cartes — téléphone & tablette portrait */}
              <div className="space-y-3 lg:hidden">
                {rentabilite.charges.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{c.libelle}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{labelCategorie(c.categorie)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {labelPeriodicite(c.periodicite)}
                            </span>
                            {!etablissementActifId && (
                              <Badge variant="outline">{c.etablissementNom}</Badge>
                            )}
                          </div>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">
                          {formatFCFA(c.montant)}
                        </p>
                      </div>
                      {c.categorie === "SALAIRE" ? (
                        <p className="flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3 shrink-0" /> Salaire — géré depuis « Personnel
                          &amp; Paie »
                        </p>
                      ) : (
                        <div className="flex justify-end gap-1 border-t border-border pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => ouvrirEdition(c)}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" /> Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => supprimer(c)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" /> Supprimer
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold">
                  <span>Total des charges</span>
                  <span className="tabular-nums">{formatFCFA(rentabilite.totalCharges)}</span>
                </div>
              </div>

              {/* Vue tableau — ordinateur */}
              <Card className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary text-left">
                      <th className="px-3 py-3 font-semibold">Catégorie</th>
                      <th className="px-3 py-3 font-semibold">Libellé</th>
                      <th className="px-3 py-3 font-semibold">Périodicité</th>
                      {!etablissementActifId && (
                        <th className="px-3 py-3 font-semibold">Maquis</th>
                      )}
                      <th className="px-3 py-3 text-right font-semibold">Montant</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentabilite.charges.map((c) => (
                      <tr key={c.id} className="border-b border-border">
                        <td className="px-3 py-2">
                          <Badge variant="outline">{labelCategorie(c.categorie)}</Badge>
                        </td>
                        <td className="px-3 py-2 font-medium">{c.libelle}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {labelPeriodicite(c.periodicite)}
                        </td>
                        {!etablissementActifId && (
                          <td className="px-3 py-2">
                            <Badge variant="outline">{c.etablissementNom}</Badge>
                          </td>
                        )}
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {formatFCFA(c.montant)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {c.categorie === "SALAIRE" ? (
                            <span
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                              title="Géré depuis Personnel & Paie"
                            >
                              <Lock className="h-3 w-3" /> Personnel
                            </span>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => ouvrirEdition(c)}
                                aria-label="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => supprimer(c)}
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary font-semibold">
                      <td className="px-3 py-3" colSpan={etablissementActifId ? 3 : 4}>
                        Total des charges
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatFCFA(rentabilite.totalCharges)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </Card>
            </>
          )}
        </>
      )}

      {etablissementActifId && (
        <ChargeDialog
          ouvert={dialogOuvert}
          onOuvertChange={setDialogOuvert}
          charge={enEdition}
          etablissementId={etablissementActifId}
          annee={annee}
          mois={mois}
          onEnregistre={async () => {
            setSucces("Charge enregistrée.");
            await charger();
          }}
        />
      )}
    </div>
  );
}

function BandeauResultat({ r }: { r: Rentabilite }) {
  const ok = r.beneficiaire;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-5 py-4 ${
        ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      <div className="flex items-center gap-3">
        {ok ? <TrendingUp className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        <div>
          <p className="text-sm font-medium opacity-80">
            {ok ? "Résultat bénéficiaire" : "Résultat déficitaire"}
          </p>
          <p className="text-2xl font-bold tabular-nums">Bénéfice net : {formatFCFA(r.beneficeNet)}</p>
        </div>
      </div>
      <p className="text-sm opacity-80">
        Taux de marge : {(r.tauxMarge * 100).toFixed(1).replace(".", ",")} %
      </p>
    </div>
  );
}

function Kpi({
  titre,
  valeur,
  sousTitre,
  icone,
}: {
  titre: string;
  valeur: string;
  sousTitre?: string;
  icone: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">{titre}</span>
          {icone}
        </div>
        <p className="text-2xl font-bold tabular-nums">{valeur}</p>
        {sousTitre && <p className="text-xs text-muted-foreground">{sousTitre}</p>}
      </CardContent>
    </Card>
  );
}

function ChargeDialog({
  ouvert,
  onOuvertChange,
  charge,
  etablissementId,
  annee,
  mois,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  charge: Charge | null;
  etablissementId: number;
  annee: number;
  mois: number;
  onEnregistre: () => Promise<void>;
}) {
  const [categorie, setCategorie] = useState<CategorieCharge>("FIXE");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [periodicite, setPeriodicite] = useState<Periodicite>("MENSUELLE");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    if (charge) {
      setCategorie(charge.categorie);
      setLibelle(charge.libelle);
      setMontant(String(charge.montant));
      setPeriodicite(charge.periodicite);
    } else {
      setCategorie("FIXE");
      setLibelle("");
      setMontant("");
      setPeriodicite("MENSUELLE");
    }
  }, [ouvert, charge]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const input = {
        etablissementId: charge ? charge.etablissementId : etablissementId,
        categorie,
        libelle,
        montant: Number(montant),
        periodicite,
        annee: charge ? charge.annee : annee,
        mois: charge ? charge.mois : mois,
      };
      if (charge) await modifierCharge(charge.id, input);
      else await creerCharge(input);
      await onEnregistre();
      onOuvertChange(false);
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur lors de l’enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{charge ? "Modifier la charge" : "Nouvelle charge"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="libelle">Libellé *</Label>
            <Input
              id="libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. Loyer, Électricité, Salaire…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie *</Label>
              <select
                id="categorie"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value as CategorieCharge)}
                className={selectClasses}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodicite">Périodicité *</Label>
              <select
                id="periodicite"
                value={periodicite}
                onChange={(e) => setPeriodicite(e.target.value as Periodicite)}
                className={selectClasses}
              >
                {PERIODICITES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Charge rattachée à {MOIS[mois - 1]} {annee}.
          </p>

          {erreur && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {erreur}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOuvertChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={envoi}>
              {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
