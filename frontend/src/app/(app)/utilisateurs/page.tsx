"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Power,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  listerUtilisateurs,
  creerUtilisateur,
  modifierUtilisateur,
  changerActivationUtilisateur,
} from "@/lib/utilisateurs";
import { HttpError } from "@/lib/api";
import type { Role, UtilisateurAdmin } from "@/types";
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

export default function UtilisateursPage() {
  const { utilisateur: courant } = useAuth();

  const [utilisateurs, setUtilisateurs] = useState<UtilisateurAdmin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<UtilisateurAdmin | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setUtilisateurs(await listerUtilisateurs());
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function ouvrirCreation() {
    setEnEdition(null);
    setDialogOuvert(true);
  }
  function ouvrirEdition(u: UtilisateurAdmin) {
    setEnEdition(u);
    setDialogOuvert(true);
  }

  async function basculerActivation(u: UtilisateurAdmin) {
    const action = u.actif ? "désactiver" : "réactiver";
    if (!confirm(`Voulez-vous ${action} le compte de « ${u.nom} » ?`)) return;
    setErreur(null);
    try {
      await changerActivationUtilisateur(u.id, !u.actif);
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Action impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Comptes propriétaires et gérants qui accèdent à l’application.
          </p>
        </div>
        <Button onClick={ouvrirCreation}>
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
      ) : utilisateurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun utilisateur.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {utilisateurs.map((u) => (
            <UtilisateurCard
              key={u.id}
              utilisateur={u}
              estMoi={courant?.id === u.id}
              onEditer={() => ouvrirEdition(u)}
              onBasculer={() => basculerActivation(u)}
            />
          ))}
        </div>
      )}

      <UtilisateurDialog
        ouvert={dialogOuvert}
        onOuvertChange={setDialogOuvert}
        utilisateur={enEdition}
        onEnregistre={charger}
      />
    </div>
  );
}

function UtilisateurCard({
  utilisateur: u,
  estMoi,
  onEditer,
  onBasculer,
}: {
  utilisateur: UtilisateurAdmin;
  estMoi: boolean;
  onEditer: () => void;
  onBasculer: () => void;
}) {
  return (
    <Card className={u.actif ? "" : "opacity-60"}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
              {u.role === "PROPRIETAIRE" ? (
                <ShieldCheck className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{u.nom}</h3>
              <Badge variant={u.role === "PROPRIETAIRE" ? "default" : "secondary"}>
                {u.role === "PROPRIETAIRE" ? "Propriétaire" : "Gérant"}
              </Badge>
            </div>
          </div>
          {!u.actif && <Badge variant="outline">Désactivé</Badge>}
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {u.email}
          </p>
          {u.telephone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {u.telephone}
            </p>
          )}
        </div>

        {u.role === "GERANT" && u.etablissements.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {u.etablissements.map((e) => (
              <Badge key={e.id} variant="outline">
                {e.nom}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onEditer}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={u.actif ? "text-destructive" : "text-success"}
            onClick={onBasculer}
            disabled={estMoi}
            title={estMoi ? "Vous ne pouvez pas désactiver votre propre compte" : undefined}
          >
            <Power className="h-4 w-4" /> {u.actif ? "Désactiver" : "Réactiver"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UtilisateurDialog({
  ouvert,
  onOuvertChange,
  utilisateur,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  utilisateur: UtilisateurAdmin | null;
  onEnregistre: () => Promise<void>;
}) {
  const { etablissements } = useEtablissement();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState<Role>("GERANT");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    setMotDePasse("");
    setVoirMdp(false);
    if (utilisateur) {
      setNom(utilisateur.nom);
      setEmail(utilisateur.email);
      setTelephone(utilisateur.telephone ?? "");
      setRole(utilisateur.role);
      setIds(utilisateur.etablissements.map((e) => e.id));
    } else {
      setNom("");
      setEmail("");
      setTelephone("");
      setRole("GERANT");
      setIds([]);
    }
  }, [ouvert, utilisateur]);

  function basculer(id: number) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!utilisateur && motDePasse.trim().length === 0) {
      setErreur("Le mot de passe est obligatoire.");
      return;
    }
    if (role === "GERANT" && ids.length === 0) {
      setErreur("Un gérant doit être rattaché à au moins un maquis.");
      return;
    }
    setEnvoi(true);
    try {
      const input = {
        nom,
        email,
        telephone: telephone.trim() || undefined,
        role,
        motDePasse: motDePasse.trim() || undefined,
        etablissementIds: ids,
      };
      if (utilisateur) await modifierUtilisateur(utilisateur.id, input);
      else await creerUtilisateur(input);
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
            {utilisateur ? "Modifier l’utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Awa Koné"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Identifiant *</Label>
              <Input
                id="email"
                type="text"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email ou pseudo (ex. jb)"
                required
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
            <Label htmlFor="role">Rôle *</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="GERANT">Gérant (saisie stock/ventes, sans finances)</option>
              <option value="PROPRIETAIRE">Propriétaire (accès complet)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mdp">
              Mot de passe {utilisateur ? "(laisser vide = inchangé)" : "*"}
            </Label>
            <div className="relative">
              <Input
                id="mdp"
                type={voirMdp ? "text" : "password"}
                autoComplete="new-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder={utilisateur ? "••••••••" : "Mot de passe"}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setVoirMdp((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={voirMdp ? "Masquer" : "Afficher"}
              >
                {voirMdp ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {role === "GERANT" && (
            <div className="space-y-2">
              <Label>Maquis rattachés *</Label>
              <div className="space-y-2 rounded-md border border-border p-3">
                {etablissements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun maquis disponible. Créez d’abord un établissement.
                  </p>
                ) : (
                  etablissements.map((e) => (
                    <label
                      key={e.id}
                      className="flex cursor-pointer items-center gap-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-input"
                        checked={ids.includes(e.id)}
                        onChange={() => basculer(e.id)}
                      />
                      {e.nom}
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Le gérant ne verra que les maquis cochés.
              </p>
            </div>
          )}

          {role === "PROPRIETAIRE" && (
            <p className="rounded-md bg-secondary px-4 py-3 text-xs text-muted-foreground">
              Un propriétaire a un accès complet à tous les maquis et aux données
              financières (marges, bénéfices, charges).
            </p>
          )}

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
