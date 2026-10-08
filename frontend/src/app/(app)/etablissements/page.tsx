"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Power, Loader2, MapPin, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  creerEtablissement,
  modifierEtablissement,
  desactiverEtablissement,
} from "@/lib/etablissements";
import { HttpError } from "@/lib/api";
import type { Etablissement } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EtablissementsPage() {
  const { estProprietaire, chargement: chargementAuth } = useAuth();
  const { etablissements, rafraichir, chargement } = useEtablissement();
  const router = useRouter();

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Etablissement | null>(null);

  useEffect(() => {
    if (!chargementAuth && !estProprietaire) router.replace("/tableau-de-bord");
  }, [estProprietaire, chargementAuth, router]);

  if (!estProprietaire) return null;

  function ouvrirCreation() {
    setEnEdition(null);
    setDialogOuvert(true);
  }

  function ouvrirEdition(e: Etablissement) {
    setEnEdition(e);
    setDialogOuvert(true);
  }

  async function desactiver(e: Etablissement) {
    if (!confirm(`Désactiver « ${e.nom} » ? Il n'apparaîtra plus dans les sélecteurs.`))
      return;
    await desactiverEtablissement(e.id);
    await rafraichir();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Établissements</h1>
          <p className="text-muted-foreground">Gérez vos maquis (points de vente).</p>
        </div>
        <Button onClick={ouvrirCreation}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : etablissements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun établissement. Cliquez sur « Ajouter » pour créer votre premier maquis.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {etablissements.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold">{e.nom}</h3>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {e.adresse && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {e.adresse}
                    </div>
                  )}
                  {e.responsable && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" /> {e.responsable}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => ouvrirEdition(e)}>
                    <Pencil className="h-4 w-4" /> Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => desactiver(e)}
                  >
                    <Power className="h-4 w-4" /> Désactiver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EtablissementDialog
        ouvert={dialogOuvert}
        onOuvertChange={setDialogOuvert}
        etablissement={enEdition}
        onEnregistre={rafraichir}
      />
    </div>
  );
}

function EtablissementDialog({
  ouvert,
  onOuvertChange,
  etablissement,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  etablissement: Etablissement | null;
  onEnregistre: () => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [responsable, setResponsable] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (ouvert) {
      setNom(etablissement?.nom ?? "");
      setAdresse(etablissement?.adresse ?? "");
      setResponsable(etablissement?.responsable ?? "");
      setErreur(null);
    }
  }, [ouvert, etablissement]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const input = { nom, adresse: adresse || undefined, responsable: responsable || undefined };
      if (etablissement) {
        await modifierEtablissement(etablissement.id, input);
      } else {
        await creerEtablissement(input);
      }
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {etablissement ? "Modifier l'établissement" : "Nouvel établissement"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Maquis Central"
              required
            />
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
            <Label htmlFor="responsable">Responsable</Label>
            <Input
              id="responsable"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Nom du responsable"
            />
          </div>

          {erreur && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {erreur}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOuvertChange(false)}
            >
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
