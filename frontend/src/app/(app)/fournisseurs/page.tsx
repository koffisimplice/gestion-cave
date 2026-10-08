"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Truck,
  Phone,
  User,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import {
  listerFournisseurs,
  creerFournisseur,
  modifierFournisseur,
  supprimerFournisseur,
} from "@/lib/fournisseurs";
import { HttpError } from "@/lib/api";
import { formatFCFA, formatNombre } from "@/lib/utils";
import type { Fournisseur } from "@/types";
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

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Fournisseur | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setFournisseurs(await listerFournisseurs());
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function supprimer(f: Fournisseur) {
    const msg =
      f.nombreAchats > 0
        ? `« ${f.nom} » a ${f.nombreAchats} achat(s) : il sera désactivé (l'historique est conservé). Continuer ?`
        : `Supprimer le fournisseur « ${f.nom} » ?`;
    if (!confirm(msg)) return;
    setErreur(null);
    try {
      await supprimerFournisseur(f.id);
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-muted-foreground">
            Répertoire des fournisseurs et suivi des achats.
          </p>
        </div>
        <Button
          onClick={() => {
            setEnEdition(null);
            setDialogOuvert(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {erreur && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {erreur}
        </div>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : fournisseurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun fournisseur. Ajoutez-en un pour l’associer à vos achats.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fournisseurs.map((f) => (
            <FournisseurCard
              key={f.id}
              fournisseur={f}
              onEditer={() => {
                setEnEdition(f);
                setDialogOuvert(true);
              }}
              onSupprimer={() => supprimer(f)}
            />
          ))}
        </div>
      )}

      <FournisseurDialog
        ouvert={dialogOuvert}
        onOuvertChange={setDialogOuvert}
        fournisseur={enEdition}
        onEnregistre={charger}
      />
    </div>
  );
}

function FournisseurCard({
  fournisseur: f,
  onEditer,
  onSupprimer,
}: {
  fournisseur: Fournisseur;
  onEditer: () => void;
  onSupprimer: () => void;
}) {
  return (
    <Card className={f.actif ? "" : "opacity-60"}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold leading-tight">{f.nom}</h3>
          </div>
          {!f.actif && <Badge variant="outline">Désactivé</Badge>}
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {f.contact && (
            <p className="flex items-center gap-2">
              <User className="h-4 w-4" /> {f.contact}
            </p>
          )}
          {f.telephone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {f.telephone}
            </p>
          )}
          {f.adresse && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {f.adresse}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
          <Badge variant="secondary" className="gap-1">
            <ShoppingCart className="h-3 w-3" /> {formatNombre(f.nombreAchats)} achat(s)
          </Badge>
          {f.montantTotalAchats != null && f.montantTotalAchats > 0 && (
            <span className="tabular-nums text-muted-foreground">
              {formatFCFA(f.montantTotalAchats)}
            </span>
          )}
        </div>

        {f.notes && <p className="text-xs italic text-muted-foreground">{f.notes}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onEditer}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={onSupprimer}
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FournisseurDialog({
  ouvert,
  onOuvertChange,
  fournisseur,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  fournisseur: Fournisseur | null;
  onEnregistre: () => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [contact, setContact] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    setNom(fournisseur?.nom ?? "");
    setTelephone(fournisseur?.telephone ?? "");
    setContact(fournisseur?.contact ?? "");
    setAdresse(fournisseur?.adresse ?? "");
    setNotes(fournisseur?.notes ?? "");
  }, [ouvert, fournisseur]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (nom.trim() === "") {
      setErreur("Le nom du fournisseur est obligatoire.");
      return;
    }
    setEnvoi(true);
    try {
      const input = {
        nom: nom.trim(),
        telephone: telephone.trim() || undefined,
        contact: contact.trim() || undefined,
        adresse: adresse.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (fournisseur) await modifierFournisseur(fournisseur.id, input);
      else await creerFournisseur(input);
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
          <DialogTitle>
            {fournisseur ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Brasserie La Ivoirienne"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Nom du commercial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Téléphone</Label>
              <Input
                id="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="0700000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Quartier, ville"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Conditions, délais de livraison, remarques…"
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
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
