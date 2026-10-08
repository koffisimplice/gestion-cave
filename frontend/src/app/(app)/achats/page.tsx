"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import { listerBoissons } from "@/lib/boissons";
import { listerCommandes, creerCommande, supprimerCommande } from "@/lib/commandes";
import { listerFournisseurs } from "@/lib/fournisseurs";
import { HttpError } from "@/lib/api";
import { formatFCFA, formatNombre } from "@/lib/utils";
import type { Boisson, CommandeFournisseur, Fournisseur } from "@/types";
import { libellesConditionnement } from "@/types";
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

function aujourdhui(): string {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

function formatDate(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export default function AchatsPage() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();

  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setCommandes(await listerCommandes(etablissementActifId));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function supprimer(c: CommandeFournisseur) {
    if (
      !confirm(
        `Supprimer cet achat de ${c.nombreCasiers} ${c.typeConditionnementLibellePluriel} de « ${c.designation} » ?\nLes ${c.bouteillesAjoutees} bouteilles seront retirées du stock du ${formatDate(
          c.date
        )}.`
      )
    )
      return;
    setErreur(null);
    setSucces(null);
    try {
      await supprimerCommande(c.id);
      setSucces("Achat supprimé et stock mis à jour.");
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Suppression impossible.");
    }
  }

  const totalMontant = useMemo(
    () => commandes.reduce((s, c) => s + (c.montantTotal ?? 0), 0),
    [commandes]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Achats</h1>
          <p className="text-muted-foreground">
            Commandes fournisseurs — les conditionnements (casiers, cartons, packs…) sont
            convertis en bouteilles et ajoutés au stock du jour.
          </p>
        </div>
        {etablissementActifId && (
          <Button size="lg" onClick={() => setDialogOuvert(true)}>
            <Plus className="h-4 w-4" /> Nouvel achat
          </Button>
        )}
      </div>

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
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Info className="h-5 w-5 shrink-0" />
            Vous consultez l’historique consolidé des deux maquis. Sélectionnez un maquis précis
            dans l’en-tête pour enregistrer un nouvel achat.
          </CardContent>
        </Card>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : commandes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun achat enregistré pour l’instant.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vue cartes — téléphone & tablette portrait */}
          <div className="space-y-3 lg:hidden">
            {commandes.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{c.designation}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(c.date)}
                        {!etablissementActifId && ` · ${c.etablissementNom}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-destructive"
                      onClick={() => supprimer(c)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Conditionnement</p>
                      <p className="tabular-nums">
                        {c.nombreCasiers} {c.typeConditionnementLibellePluriel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bouteilles</p>
                      <p className="font-medium tabular-nums">
                        +{formatNombre(c.bouteillesAjoutees)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fournisseur</p>
                      <p className="text-muted-foreground">{c.fournisseur ?? "—"}</p>
                    </div>
                    {estProprietaire && (
                      <div>
                        <p className="text-xs text-muted-foreground">Montant</p>
                        <p className="font-semibold tabular-nums">
                          {c.montantTotal != null ? formatFCFA(c.montantTotal) : "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {estProprietaire && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold">
                <span>Total des achats</span>
                <span className="tabular-nums">{formatFCFA(totalMontant)}</span>
              </div>
            )}
          </div>

          {/* Vue tableau — ordinateur */}
          <Card className="hidden overflow-hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Boisson</th>
                  {!etablissementActifId && (
                    <th className="px-3 py-3 font-semibold">Maquis</th>
                  )}
                  <th className="px-3 py-3 text-right font-semibold">Conditionnement</th>
                  <th className="px-3 py-3 text-right font-semibold">Bouteilles</th>
                  <th className="px-3 py-3 font-semibold">Fournisseur</th>
                  {estProprietaire && (
                    <th className="px-3 py-3 text-right font-semibold">Montant</th>
                  )}
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {commandes.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {formatDate(c.date)}
                    </td>
                    <td className="px-3 py-2 font-medium">{c.designation}</td>
                    {!etablissementActifId && (
                      <td className="px-3 py-2">
                        <Badge variant="outline">{c.etablissementNom}</Badge>
                      </td>
                    )}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {c.nombreCasiers} {c.typeConditionnementLibellePluriel}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      +{formatNombre(c.bouteillesAjoutees)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.fournisseur ?? "—"}
                    </td>
                    {estProprietaire && (
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {c.montantTotal != null ? formatFCFA(c.montantTotal) : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => supprimer(c)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {estProprietaire && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary font-semibold">
                    <td className="px-3 py-3" colSpan={etablissementActifId ? 5 : 6}>
                      Total des achats
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatFCFA(totalMontant)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </Card>
        </>
      )}

      {etablissementActifId && (
        <AchatDialog
          ouvert={dialogOuvert}
          onOuvertChange={setDialogOuvert}
          etablissementId={etablissementActifId}
          etablissementNom={
            etablissements.find((e) => e.id === etablissementActifId)?.nom ?? ""
          }
          estProprietaire={estProprietaire}
          onEnregistre={async () => {
            setSucces("Achat enregistré. Le stock du jour a été mis à jour.");
            await charger();
          }}
        />
      )}
    </div>
  );
}

function AchatDialog({
  ouvert,
  onOuvertChange,
  etablissementId,
  etablissementNom,
  estProprietaire,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  etablissementId: number;
  etablissementNom: string;
  estProprietaire: boolean;
  onEnregistre: () => Promise<void>;
}) {
  const [boissons, setBoissons] = useState<Boisson[]>([]);
  const [boissonId, setBoissonId] = useState<string>("");
  const [date, setDate] = useState(aujourdhui());
  const [casiers, setCasiers] = useState("1");
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  // "" = aucun ; "autre" = saisie libre ; sinon l'id de la fiche fournisseur.
  const [fournisseurChoix, setFournisseurChoix] = useState<string>("");
  const [fournisseur, setFournisseur] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    setDate(aujourdhui());
    setCasiers("1");
    setFournisseurChoix("");
    setFournisseur("");
    setPrixAchat("");
    listerBoissons(etablissementId).then((bs) => {
      setBoissons(bs);
      setBoissonId(bs.length > 0 ? String(bs[0].id) : "");
    });
    listerFournisseurs()
      .then((fs) => setFournisseurs(fs.filter((f) => f.actif)))
      .catch(() => setFournisseurs([]));
  }, [ouvert, etablissementId]);

  const boisson = boissons.find((b) => String(b.id) === boissonId) ?? null;
  const cond = libellesConditionnement(boisson?.typeConditionnement);
  const nbCasiers = casiers === "" ? 0 : Number(casiers);
  const bouteilles =
    boisson && nbCasiers > 0 ? boisson.bouteillesParConditionnement * nbCasiers : 0;

  // Prix effectif : saisi (propriétaire) sinon prix du catalogue.
  const prixCasierEffectif =
    prixAchat !== "" ? Number(prixAchat) : boisson?.prixAchatCasier ?? null;
  const montant =
    prixCasierEffectif != null && nbCasiers > 0 ? prixCasierEffectif * nbCasiers : null;

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!boisson) {
      setErreur("Choisissez une boisson.");
      return;
    }
    if (nbCasiers < 1) {
      setErreur(`Le nombre de ${cond.pluriel} doit être d’au moins 1.`);
      return;
    }
    setEnvoi(true);
    try {
      const fournisseurIdChoisi =
        fournisseurChoix !== "" && fournisseurChoix !== "autre"
          ? Number(fournisseurChoix)
          : undefined;
      const fournisseurTexte =
        fournisseurChoix === "autre" ? fournisseur.trim() || undefined : undefined;
      await creerCommande({
        boissonId: boisson.id,
        etablissementId,
        date,
        nombreCasiers: nbCasiers,
        fournisseurId: fournisseurIdChoisi,
        fournisseur: fournisseurTexte,
        prixAchatCasier:
          estProprietaire && prixAchat !== "" ? Number(prixAchat) : undefined,
      });
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
          <DialogTitle>Nouvel achat — {etablissementNom}</DialogTitle>
        </DialogHeader>

        {boissons.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune boisson dans ce maquis. Ajoutez d’abord des boissons au catalogue.
          </p>
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="boisson">Boisson *</Label>
              <select
                id="boisson"
                value={boissonId}
                onChange={(e) => setBoissonId(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {boissons.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.designation} ({b.bouteillesParConditionnement} /{" "}
                    {libellesConditionnement(b.typeConditionnement).singulier})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="casiers" className="capitalize">
                  Nombre de {cond.pluriel} *
                </Label>
                <Input
                  id="casiers"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={casiers}
                  onChange={(e) => setCasiers(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  max={aujourdhui()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur (optionnel)</Label>
              <select
                id="fournisseur"
                value={fournisseurChoix}
                onChange={(e) => setFournisseurChoix(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">— Aucun —</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
                <option value="autre">Autre (saisir le nom)…</option>
              </select>
              {fournisseurChoix === "autre" && (
                <Input
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                  placeholder="Nom du fournisseur"
                  className="mt-2"
                />
              )}
              {fournisseurs.length === 0 && fournisseurChoix !== "autre" && (
                <p className="text-xs text-muted-foreground">
                  Astuce : créez vos fournisseurs dans le menu « Fournisseurs » pour suivre
                  l’historique d’achats.
                </p>
              )}
            </div>

            {estProprietaire && (
              <div className="space-y-2">
                <Label htmlFor="prix" className="capitalize">
                  Prix d’achat {cond.singulier} (FCFA)
                </Label>
                <Input
                  id="prix"
                  type="number"
                  min={0}
                  step="1"
                  value={prixAchat}
                  onChange={(e) => setPrixAchat(e.target.value)}
                  placeholder={
                    boisson?.prixAchatCasier != null
                      ? `Catalogue : ${boisson.prixAchatCasier}`
                      : "Prix du catalogue"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser le prix du catalogue.
                </p>
              </div>
            )}

            {/* Aperçu de la conversion, mis à jour en direct */}
            <div className="space-y-2 rounded-md bg-secondary px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" /> Bouteilles ajoutées au stock
                </span>
                <span className="text-lg font-bold">{formatNombre(bouteilles)}</span>
              </div>
              {estProprietaire && montant != null && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" /> Montant de l’achat
                  </span>
                  <span className="font-semibold">{formatFCFA(montant)}</span>
                </div>
              )}
            </div>

            {erreur && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {erreur}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOuvertChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={envoi || bouteilles === 0}>
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer l’achat
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
