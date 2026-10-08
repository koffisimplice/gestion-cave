"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Power, Loader2, AlertTriangle, Package } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  listerBoissons,
  creerBoisson,
  modifierBoisson,
  desactiverBoisson,
} from "@/lib/boissons";
import { HttpError } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import type { Boisson, TypeConditionnement } from "@/types";
import { CONDITIONNEMENTS, libellesConditionnement } from "@/types";
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

export default function BoissonsPage() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId } = useEtablissement();

  const [boissons, setBoissons] = useState<Boisson[]>([]);
  const [chargement, setChargement] = useState(true);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Boisson | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setBoissons(await listerBoissons(etablissementActifId));
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId]);

  useEffect(() => {
    charger();
  }, [charger]);

  function ouvrirCreation() {
    setEnEdition(null);
    setDialogOuvert(true);
  }
  function ouvrirEdition(b: Boisson) {
    setEnEdition(b);
    setDialogOuvert(true);
  }
  async function desactiver(b: Boisson) {
    if (!confirm(`Désactiver « ${b.designation} » ?`)) return;
    await desactiverBoisson(b.id);
    await charger();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boissons</h1>
          <p className="text-muted-foreground">
            Catalogue des produits{estProprietaire ? " (prix de revient inclus)" : ""}.
          </p>
        </div>
        {estProprietaire && (
          <Button onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
        )}
      </div>

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : boissons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune boisson pour l’instant.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boissons.map((b) => (
            <BoissonCard
              key={b.id}
              boisson={b}
              estProprietaire={estProprietaire}
              onEditer={() => ouvrirEdition(b)}
              onDesactiver={() => desactiver(b)}
            />
          ))}
        </div>
      )}

      {estProprietaire && (
        <BoissonDialog
          ouvert={dialogOuvert}
          onOuvertChange={setDialogOuvert}
          boisson={enEdition}
          onEnregistre={charger}
        />
      )}
    </div>
  );
}

function BoissonCard({
  boisson: b,
  estProprietaire,
  onEditer,
  onDesactiver,
}: {
  boisson: Boisson;
  estProprietaire: boolean;
  onEditer: () => void;
  onDesactiver: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">{b.designation}</h3>
          {b.categorie && <Badge variant="secondary">{b.categorie}</Badge>}
        </div>

        <div className="space-y-1.5 text-sm">
          <Ligne label="Conditionnement">
            <span className="flex items-center gap-1 capitalize">
              <Package className="h-4 w-4 text-muted-foreground" />
              {libellesConditionnement(b.typeConditionnement).singulier} de{" "}
              {b.bouteillesParConditionnement} bouteilles
            </span>
          </Ligne>
          <Ligne label="Prix de vente">{formatFCFA(b.prixVenteUnitaire)}</Ligne>

          {estProprietaire && b.prixAchatCasier != null && (
            <>
              <Ligne
                label={`Prix d’achat ${libellesConditionnement(b.typeConditionnement).singulier}`}
              >
                {formatFCFA(b.prixAchatCasier)}
              </Ligne>
              <Ligne label="Prix de revient">
                <span className="font-medium">
                  {b.prixRevientUnitaire != null ? formatFCFA(b.prixRevientUnitaire) : "—"}
                </span>
              </Ligne>
            </>
          )}

          <Ligne label="Seuil d’alerte">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {b.seuilAlerte} bouteilles
            </span>
          </Ligne>
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {b.etablissements.map((e) => (
            <Badge key={e.id} variant="outline">
              {e.nom}
            </Badge>
          ))}
        </div>

        {estProprietaire && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onEditer}>
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={onDesactiver}
            >
              <Power className="h-4 w-4" /> Désactiver
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function BoissonDialog({
  ouvert,
  onOuvertChange,
  boisson,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  boisson: Boisson | null;
  onEnregistre: () => Promise<void>;
}) {
  const { etablissements, etablissementActifId } = useEtablissement();

  const [designation, setDesignation] = useState("");
  const [typeConditionnement, setTypeConditionnement] =
    useState<TypeConditionnement>("CASIER");
  const [conditionnement, setConditionnement] = useState("12");
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [seuil, setSeuil] = useState("0");
  const [categorie, setCategorie] = useState("");
  const [ids, setIds] = useState<number[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    if (boisson) {
      setDesignation(boisson.designation);
      setTypeConditionnement(boisson.typeConditionnement ?? "CASIER");
      setConditionnement(String(boisson.bouteillesParConditionnement));
      setPrixAchat(boisson.prixAchatCasier != null ? String(boisson.prixAchatCasier) : "");
      setPrixVente(String(boisson.prixVenteUnitaire));
      setSeuil(String(boisson.seuilAlerte));
      setCategorie(boisson.categorie ?? "");
      setIds(boisson.etablissements.map((e) => e.id));
    } else {
      setDesignation("");
      setTypeConditionnement("CASIER");
      setConditionnement("12");
      setPrixAchat("");
      setPrixVente("");
      setSeuil("0");
      setCategorie("");
      setIds(etablissementActifId ? [etablissementActifId] : etablissements.map((e) => e.id));
    }
  }, [ouvert, boisson, etablissements, etablissementActifId]);

  function basculer(id: number) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (ids.length === 0) {
      setErreur("Sélectionnez au moins un établissement.");
      return;
    }
    setEnvoi(true);
    try {
      const input = {
        designation,
        typeConditionnement,
        bouteillesParConditionnement: Number(conditionnement),
        prixAchatCasier: Number(prixAchat),
        prixVenteUnitaire: Number(prixVente),
        seuilAlerte: Number(seuil),
        categorie: categorie || undefined,
        etablissementIds: ids,
      };
      if (boisson) await modifierBoisson(boisson.id, input);
      else await creerBoisson(input);
      await onEnregistre();
      onOuvertChange(false);
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{boisson ? "Modifier la boisson" : "Nouvelle boisson"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="designation">Désignation *</Label>
            <Input
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Ex. Bière Brune 60cl"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type de conditionnement *</Label>
              <select
                id="type"
                value={typeConditionnement}
                onChange={(e) =>
                  setTypeConditionnement(e.target.value as TypeConditionnement)
                }
                className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {(Object.keys(CONDITIONNEMENTS) as TypeConditionnement[]).map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {CONDITIONNEMENTS[t].singulier}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond">
                Bouteilles / {CONDITIONNEMENTS[typeConditionnement].singulier} *
              </Label>
              <Input
                id="cond"
                type="number"
                min={1}
                value={conditionnement}
                onChange={(e) => setConditionnement(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat">Catégorie</Label>
            <Input
              id="cat"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder="Bière, Soft…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="achat">
                Prix d’achat {CONDITIONNEMENTS[typeConditionnement].singulier} (FCFA) *
              </Label>
              <Input
                id="achat"
                type="number"
                min={0}
                step="1"
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vente">Prix de vente unitaire (FCFA) *</Label>
              <Input
                id="vente"
                type="number"
                min={0}
                step="1"
                value={prixVente}
                onChange={(e) => setPrixVente(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seuil">Seuil d’alerte (bouteilles)</Label>
            <Input
              id="seuil"
              type="number"
              min={0}
              value={seuil}
              onChange={(e) => setSeuil(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Disponible dans *</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {etablissements.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-input"
                    checked={ids.includes(e.id)}
                    onChange={() => basculer(e.id)}
                  />
                  {e.nom}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cochez plusieurs maquis pour partager la boisson sans la ressaisir.
            </p>
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
