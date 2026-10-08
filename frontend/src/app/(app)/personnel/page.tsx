"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  Info,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Users,
  BadgeCheck,
  CircleDollarSign,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  listerEmployes,
  creerEmploye,
  modifierEmploye,
  supprimerEmploye,
  getEtatPaie,
  payerSalaire,
  annulerPaiement,
} from "@/lib/personnel";
import { HttpError } from "@/lib/api";
import { formatFCFA } from "@/lib/utils";
import type { Employe, EmployeInput, LignePaie } from "@/types";
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

const selectClasses =
  "flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function aujourdhui(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}
function formatDate(s: string): string {
  const [a, m, j] = s.split("-");
  return `${j}/${m}/${a}`;
}

export default function PersonnelPage() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();

  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [lignes, setLignes] = useState<LignePaie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [employeDialog, setEmployeDialog] = useState(false);
  const [enEdition, setEnEdition] = useState<Employe | null>(null);
  const [paiementCible, setPaiementCible] = useState<LignePaie | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [emps, paie] = await Promise.all([
        listerEmployes(etablissementActifId),
        getEtatPaie(annee, mois, etablissementActifId),
      ]);
      setEmployes(emps.filter((e) => e.actif));
      setLignes(paie);
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [annee, mois, etablissementActifId]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Statut de paie du mois, indexé par employé.
  const paieParEmploye = useMemo(() => {
    const map = new Map<number, LignePaie>();
    lignes.forEach((l) => map.set(l.employeId, l));
    return map;
  }, [lignes]);

  const totaux = useMemo(() => {
    let prevu = 0;
    let paye = 0;
    let reste = 0;
    employes.forEach((e) => {
      prevu += e.salaireMensuel;
      const l = paieParEmploye.get(e.id);
      if (l?.paye) paye += l.montantPaye ?? 0;
      else reste += e.salaireMensuel;
    });
    return { prevu, paye, reste };
  }, [employes, paieParEmploye]);

  const annees = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const consolide = !etablissementActifId;
  const nomPerimetre = consolide
    ? "Vue consolidée (tous les maquis)"
    : etablissements.find((e) => e.id === etablissementActifId)?.nom ?? "";

  function ouvrirCreation() {
    setEnEdition(null);
    setEmployeDialog(true);
  }
  function ouvrirEdition(e: Employe) {
    setEnEdition(e);
    setEmployeDialog(true);
  }

  async function supprimer(e: Employe) {
    if (
      !confirm(
        `Supprimer l'employé « ${e.nom} » ?\nS'il a déjà des salaires versés, il sera désactivé (l'historique et les charges sont conservés).`
      )
    )
      return;
    setErreur(null);
    setSucces(null);
    try {
      await supprimerEmploye(e.id);
      setSucces("Employé supprimé.");
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Suppression impossible.");
    }
  }

  async function annuler(l: LignePaie) {
    if (
      !confirm(
        `Annuler le paiement du salaire de « ${l.nom} » pour ${MOIS[mois - 1]} ${annee} ?\nLa charge correspondante sera supprimée.`
      )
    )
      return;
    setErreur(null);
    setSucces(null);
    try {
      await annulerPaiement(l.paiementId!);
      setSucces("Paiement annulé. La charge a été retirée.");
      await charger();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Annulation impossible.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6 text-primary" /> Personnel &amp; Paie
          </h1>
          <p className="text-muted-foreground">{nomPerimetre}</p>
        </div>
        {etablissementActifId && (
          <Button size="lg" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" /> Nouvel employé
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
          ajouter un employé. La vue consolidée cumule le personnel des maquis.
        </div>
      )}

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* Synthèse de la masse salariale du mois */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              titre="Salaires prévus"
              valeur={formatFCFA(totaux.prevu)}
              icone={<Wallet className="h-5 w-5" />}
            />
            <Kpi
              titre="Déjà payé"
              valeur={formatFCFA(totaux.paye)}
              icone={<BadgeCheck className="h-5 w-5" />}
              accent="success"
            />
            <Kpi
              titre="Reste à payer"
              valeur={formatFCFA(totaux.reste)}
              icone={<CircleDollarSign className="h-5 w-5" />}
              accent={totaux.reste > 0 ? "warning" : undefined}
            />
          </div>

          {employes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun employé pour l’instant.
                {etablissementActifId && " Cliquez sur « Nouvel employé » pour commencer."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {employes.map((e) => {
                const l = paieParEmploye.get(e.id);
                const paye = l?.paye ?? false;
                return (
                  <Card key={e.id}>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{e.nom}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {e.poste && <span>{e.poste}</span>}
                            {consolide && (
                              <Badge variant="outline">{e.etablissementNom}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => ouvrirEdition(e)}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => supprimer(e)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Salaire de base</p>
                          <p className="font-semibold tabular-nums">
                            {formatFCFA(e.salaireMensuel)}
                          </p>
                        </div>

                        {paye ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-right">
                              <Badge variant="success" className="gap-1">
                                <BadgeCheck className="h-3 w-3" /> Payé
                              </Badge>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatFCFA(l!.montantPaye ?? 0)} · le{" "}
                                {l!.datePaiement ? formatDate(l!.datePaiement) : "—"}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => annuler(l!)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setPaiementCible(l ?? null)}>
                            <CheckCircle2 className="h-4 w-4" /> Marquer payé
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold">
                <span>
                  {MOIS[mois - 1]} {annee} — {employes.length} employé
                  {employes.length > 1 ? "s" : ""}
                </span>
                <span className="tabular-nums">
                  Payé {formatFCFA(totaux.paye)} / {formatFCFA(totaux.prevu)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {etablissementActifId && (
        <EmployeDialog
          ouvert={employeDialog}
          onOuvertChange={setEmployeDialog}
          employe={enEdition}
          etablissementId={etablissementActifId}
          onEnregistre={async () => {
            setSucces(enEdition ? "Employé modifié." : "Employé ajouté.");
            await charger();
          }}
        />
      )}

      <PaiementDialog
        ligne={paiementCible}
        annee={annee}
        mois={mois}
        moisLabel={MOIS[mois - 1]}
        onFermer={() => setPaiementCible(null)}
        onPaye={async () => {
          setSucces("Salaire payé. La charge du mois a été créée.");
          await charger();
        }}
      />
    </div>
  );
}

function Kpi({
  titre,
  valeur,
  icone,
  accent,
}: {
  titre: string;
  valeur: string;
  icone: React.ReactNode;
  accent?: "success" | "warning";
}) {
  const couleur =
    accent === "success"
      ? "text-success"
      : accent === "warning"
      ? "text-warning"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-sm font-medium">{titre}</span>
          {icone}
        </div>
        <p className={`text-2xl font-bold tabular-nums ${couleur}`}>{valeur}</p>
      </CardContent>
    </Card>
  );
}

function EmployeDialog({
  ouvert,
  onOuvertChange,
  employe,
  etablissementId,
  onEnregistre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  employe: Employe | null;
  etablissementId: number;
  onEnregistre: () => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("");
  const [salaire, setSalaire] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateEmbauche, setDateEmbauche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);
    setNom(employe?.nom ?? "");
    setPoste(employe?.poste ?? "");
    setSalaire(employe ? String(employe.salaireMensuel) : "");
    setTelephone(employe?.telephone ?? "");
    setDateEmbauche(employe?.dateEmbauche ?? "");
  }, [ouvert, employe]);

  async function soumettre(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    if (salaire === "" || Number(salaire) < 0) {
      setErreur("Indiquez un salaire mensuel valide.");
      return;
    }
    setEnvoi(true);
    try {
      const input: EmployeInput = {
        etablissementId,
        nom: nom.trim(),
        poste: poste.trim() || undefined,
        salaireMensuel: Number(salaire),
        telephone: telephone.trim() || undefined,
        dateEmbauche: dateEmbauche || null,
      };
      if (employe) await modifierEmploye(employe.id, input);
      else await creerEmploye(input);
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
          <DialogTitle>{employe ? "Modifier l’employé" : "Nouvel employé"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Kouassi Jean"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="poste">Poste</Label>
              <Input
                id="poste"
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                placeholder="Serveur, Cuisinier…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaire">Salaire mensuel (FCFA) *</Label>
              <Input
                id="salaire"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                value={salaire}
                onChange={(e) => setSalaire(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tel">Téléphone</Label>
              <Input
                id="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="07 00 00 00 00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="embauche">Date d’embauche</Label>
              <Input
                id="embauche"
                type="date"
                max={aujourdhui()}
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
              />
            </div>
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
              {employe ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaiementDialog({
  ligne,
  annee,
  mois,
  moisLabel,
  onFermer,
  onPaye,
}: {
  ligne: LignePaie | null;
  annee: number;
  mois: number;
  moisLabel: string;
  onFermer: () => void;
  onPaye: () => Promise<void>;
}) {
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ligne) return;
    setErreur(null);
    setMontant(String(ligne.salaireMensuel));
    setDate(aujourdhui());
  }, [ligne]);

  async function soumettre(ev: React.FormEvent) {
    ev.preventDefault();
    if (!ligne) return;
    setErreur(null);
    if (montant === "" || Number(montant) < 0) {
      setErreur("Indiquez un montant valide.");
      return;
    }
    setEnvoi(true);
    try {
      await payerSalaire({
        employeId: ligne.employeId,
        annee,
        mois,
        montant: Number(montant),
        datePaiement: date,
      });
      await onPaye();
      onFermer();
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Paiement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Dialog open={ligne !== null} onOpenChange={(v) => !v && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payer le salaire — {ligne?.nom}</DialogTitle>
        </DialogHeader>
        {ligne && (
          <form onSubmit={soumettre} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Salaire de {moisLabel} {annee}. Le montant est pré-rempli avec le salaire de base,
              tu peux l’ajuster (prime, retenue, mois partiel).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="montant">Montant versé (FCFA) *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="datePaie">Date du paiement *</Label>
                <Input
                  id="datePaie"
                  type="date"
                  max={aujourdhui()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="rounded-md bg-secondary px-4 py-3 text-xs text-muted-foreground">
              Ce paiement crée automatiquement une charge « Salaire » du mois → il réduit le
              bénéfice net dans « Charges & rentabilité ».
            </div>

            {erreur && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {erreur}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onFermer}>
                Annuler
              </Button>
              <Button type="submit" disabled={envoi}>
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmer le paiement
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
