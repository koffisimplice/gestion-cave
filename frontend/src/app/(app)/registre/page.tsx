"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Plus,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { useEtablissement } from "@/lib/etablissement-context";
import {
  getPointDuJour,
  majLigne,
  cloturerPoint,
  enregistrerVente,
} from "@/lib/registre";
import { HttpError } from "@/lib/api";
import { formatFCFA, formatNombre } from "@/lib/utils";
import type { LigneRegistre, PointJournalier } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

function aujourdhui(): string {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

type Edits = Record<number, { commande: string; vendu: string; perdu: string }>;

/** Une ligne du panier de vente (une boisson + sa quantité). */
interface PanierItem {
  ligneId: number;
  designation: string;
  prixUnitaire: number;
  quantite: number;
}

function initEdits(point: PointJournalier): Edits {
  const e: Edits = {};
  for (const l of point.lignes) {
    e[l.id] = {
      commande: String(l.commandeDuJour),
      vendu: l.stockVendu != null ? String(l.stockVendu) : "",
      perdu: l.stockPerdu ? String(l.stockPerdu) : "",
    };
  }
  return e;
}

export default function RegistrePage() {
  const { etablissementActifId, etablissements } = useEtablissement();
  const [date, setDate] = useState(aujourdhui());
  const [point, setPoint] = useState<PointJournalier | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [chargement, setChargement] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  // Vente (popup avec panier)
  const [venteOuvert, setVenteOuvert] = useState(false);
  const [venteEnCours, setVenteEnCours] = useState(false);

  const charger = useCallback(async () => {
    if (!etablissementActifId) {
      setPoint(null);
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const p = await getPointDuJour(etablissementActifId, date);
      setPoint(p);
      setEdits(initEdits(p));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId, date]);

  useEffect(() => {
    charger();
  }, [charger]);

  const cloture = point?.statut === "CLOTURE";

  async function sauvegarderLigne(ligne: LigneRegistre) {
    const e = edits[ligne.id];
    if (!e) return;
    const commande = e.commande === "" ? 0 : Number(e.commande);
    const vendu = e.vendu === "" ? null : Number(e.vendu);
    const perdu = e.perdu === "" ? 0 : Number(e.perdu);

    // Rien à faire si inchangé.
    if (
      commande === ligne.commandeDuJour &&
      vendu === (ligne.stockVendu ?? null) &&
      perdu === ligne.stockPerdu
    )
      return;

    setSavingId(ligne.id);
    setErreur(null);
    setSucces(null);
    try {
      const p = await majLigne(ligne.id, commande, vendu, perdu);
      setPoint(p);
      setEdits(initEdits(p));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur d'enregistrement.");
      await charger();
    } finally {
      setSavingId(null);
    }
  }

  async function vendreUn(ligne: LigneRegistre) {
    setSavingId(ligne.id);
    setErreur(null);
    setSucces(null);
    try {
      const p = await enregistrerVente(ligne.id, 1);
      setPoint(p);
      setEdits(initEdits(p));
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Vente impossible.");
    } finally {
      setSavingId(null);
    }
  }

  /**
   * Enregistre tout un panier (plusieurs boissons d'un même client) en une fois.
   * Les lignes sont envoyées une par une au serveur ; en cas d'erreur en cours de
   * route, on resynchronise le point pour refléter ce qui a réellement été enregistré.
   */
  async function enregistrerPanier(panier: PanierItem[]) {
    if (panier.length === 0) return;
    setErreur(null);
    setSucces(null);
    setVenteEnCours(true);
    try {
      let dernier: PointJournalier | null = null;
      for (const item of panier) {
        dernier = await enregistrerVente(item.ligneId, item.quantite);
      }
      if (dernier) {
        setPoint(dernier);
        setEdits(initEdits(dernier));
      }
      const totalArticles = panier.reduce((s, i) => s + i.quantite, 0);
      setSucces(
        `Vente enregistrée : ${totalArticles} article(s) sur ${panier.length} boisson(s).`
      );
      setVenteOuvert(false);
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Vente impossible.");
      await charger(); // certaines lignes ont pu passer : on resynchronise
    } finally {
      setVenteEnCours(false);
    }
  }

  async function arreterLePoint() {
    if (!etablissementActifId) return;
    if (!confirm("Arrêter le point du jour ? La journée sera verrouillée et ne pourra plus être modifiée."))
      return;
    setErreur(null);
    setSucces(null);
    try {
      const p = await cloturerPoint(etablissementActifId, date);
      setPoint(p);
      setEdits(initEdits(p));
      setSucces("Point du jour arrêté et enregistré. L'ancien stock de demain est prêt.");
    } catch (err) {
      setErreur(err instanceof HttpError ? err.message : "Erreur lors de la clôture.");
    }
  }

  // Propriétaire en vue consolidée : pas d'établissement précis à saisir.
  if (!etablissementActifId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Registre du jour</h1>
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Info className="h-5 w-5 shrink-0" />
            Sélectionnez un maquis précis dans l’en-tête (au lieu de « Vue consolidée ») pour
            saisir le registre.
          </CardContent>
        </Card>
      </div>
    );
  }

  const nomEtab = etablissements.find((e) => e.id === etablissementActifId)?.nom ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Registre du jour</h1>
          <p className="text-muted-foreground">{nomEtab}</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium">
              Date
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              max={aujourdhui()}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
        </div>
      </div>

      {cloture && (
        <div className="flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-medium">
          <Lock className="h-4 w-4" /> Journée clôturée — lecture seule.
        </div>
      )}
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

      {chargement ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !point || point.lignes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune boisson disponible dans ce maquis. Ajoutez des boissons au catalogue.
          </CardContent>
        </Card>
      ) : (
        <>
          {!cloture && (
            <div className="flex justify-end">
              <Button size="lg" onClick={() => setVenteOuvert(true)}>
                <Plus className="h-4 w-4" /> Nouvelle vente
              </Button>
            </div>
          )}

          <VentePopup
            ouvert={venteOuvert}
            onOuvertChange={setVenteOuvert}
            lignes={point.lignes}
            enCours={venteEnCours}
            onValider={enregistrerPanier}
          />

          {/* Vue cartes — téléphone & tablette portrait (usage au comptoir) */}
          <div className="space-y-3 lg:hidden">
            {point.lignes.map((l) => (
              <LigneCard
                key={l.id}
                ligne={l}
                edit={edits[l.id]}
                cloture={cloture}
                saving={savingId === l.id}
                onChange={(champ, val) =>
                  setEdits((prev) => ({
                    ...prev,
                    [l.id]: { ...prev[l.id], [champ]: val },
                  }))
                }
                onBlur={() => sauvegarderLigne(l)}
                onVendre={() => vendreUn(l)}
              />
            ))}
            <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-semibold">
              <span>Total vendu : {formatNombre(point.totalVendu)}</span>
              {point.totalPerdu > 0 && (
                <span className="text-warning">Perte : {formatNombre(point.totalPerdu)}</span>
              )}
              <span>{formatFCFA(point.totalPrixVenteTotal)}</span>
            </div>
          </div>

          {/* Vue tableau — ordinateur */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary text-left">
                    <th className="sticky left-0 z-10 bg-secondary px-3 py-3 font-semibold">Désignation</th>
                    <th className="px-3 py-3 text-right font-semibold">Ancien</th>
                    <th className="px-3 py-3 text-right font-semibold">Commande</th>
                    <th className="px-3 py-3 text-right font-semibold">Nouveau</th>
                    <th className="px-3 py-3 text-center font-semibold">Vendu</th>
                    <th className="px-3 py-3 text-center font-semibold">Perte</th>
                    <th className="px-3 py-3 text-right font-semibold">Restant</th>
                    <th className="px-3 py-3 text-right font-semibold">P.U</th>
                    <th className="px-3 py-3 text-right font-semibold">P.V.T</th>
                  </tr>
                </thead>
                <tbody>
                  {point.lignes.map((l) => (
                    <LigneRow
                      key={l.id}
                      ligne={l}
                      edit={edits[l.id]}
                      cloture={cloture}
                      saving={savingId === l.id}
                      onChange={(champ, val) =>
                        setEdits((prev) => ({
                          ...prev,
                          [l.id]: { ...prev[l.id], [champ]: val },
                        }))
                      }
                      onBlur={() => sauvegarderLigne(l)}
                      onVendre={() => vendreUn(l)}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary font-semibold">
                    <td className="sticky left-0 z-10 bg-secondary px-3 py-3">Total</td>
                    <td colSpan={3}></td>
                    <td className="px-3 py-3 text-center">{formatNombre(point.totalVendu)}</td>
                    <td className="px-3 py-3 text-center">
                      {point.totalPerdu > 0 ? formatNombre(point.totalPerdu) : "—"}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="px-3 py-3 text-right">{formatFCFA(point.totalPrixVenteTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {!cloture && (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Enregistrez chaque vente avec « +1 » ou saisissez la quantité vendue. Le stock
                restant se calcule automatiquement.
              </p>
              <Button size="lg" onClick={arreterLePoint} className="sm:w-auto">
                <Lock className="h-4 w-4" /> Arrêter le point
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VentePopup({
  ouvert,
  onOuvertChange,
  lignes,
  enCours,
  onValider,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  lignes: LigneRegistre[];
  enCours: boolean;
  onValider: (panier: PanierItem[]) => void;
}) {
  const [boissonId, setBoissonId] = useState<string>("");
  const [quantite, setQuantite] = useState<string>("1");
  const [panier, setPanier] = useState<PanierItem[]>([]);
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);

  // Réinitialise tout le formulaire à chaque ouverture/fermeture de la popup.
  function changerOuverture(v: boolean) {
    if (!v) {
      setBoissonId("");
      setQuantite("1");
      setPanier([]);
      setErreurLocale(null);
    }
    onOuvertChange(v);
  }

  const ligne = lignes.find((l) => String(l.id) === boissonId);
  const disponible = ligne
    ? ligne.stockRestant != null
      ? ligne.stockRestant
      : ligne.nouveauStock
    : 0;
  // Quantité de cette boisson déjà présente dans le panier.
  const dejaAuPanier = ligne
    ? panier.filter((p) => p.ligneId === ligne.id).reduce((s, p) => s + p.quantite, 0)
    : 0;
  const resteDisponible = disponible - dejaAuPanier;

  const quantiteNum = Number(quantite);
  const quantiteValide = Number.isInteger(quantiteNum) && quantiteNum > 0;
  const sousTotalLigne = ligne && quantiteValide ? ligne.prixUnitaire * quantiteNum : 0;

  // Montant total du panier, calculé automatiquement.
  const totalPanier = panier.reduce((s, p) => s + p.prixUnitaire * p.quantite, 0);
  const totalArticles = panier.reduce((s, p) => s + p.quantite, 0);

  // Aucune boisson n'a de stock disponible : rien n'est vendable.
  const aucunStock = lignes.every(
    (l) => (l.stockRestant != null ? l.stockRestant : l.nouveauStock) <= 0
  );

  function ajouterAuPanier() {
    setErreurLocale(null);
    if (!ligne) {
      setErreurLocale("Sélectionnez une boisson.");
      return;
    }
    if (!quantiteValide) {
      setErreurLocale("La quantité doit être un nombre supérieur à 0.");
      return;
    }
    if (quantiteNum > resteDisponible) {
      setErreurLocale(
        `Stock insuffisant : il reste ${resteDisponible} unité(s) disponible(s) pour ${ligne.designation}.`
      );
      return;
    }
    setPanier((prev) => {
      const idx = prev.findIndex((p) => p.ligneId === ligne.id);
      if (idx >= 0) {
        const copie = [...prev];
        copie[idx] = { ...copie[idx], quantite: copie[idx].quantite + quantiteNum };
        return copie;
      }
      return [
        ...prev,
        {
          ligneId: ligne.id,
          designation: ligne.designation,
          prixUnitaire: ligne.prixUnitaire,
          quantite: quantiteNum,
        },
      ];
    });
    // On réinitialise la sélection pour enchaîner la boisson suivante.
    setBoissonId("");
    setQuantite("1");
  }

  function retirerDuPanier(ligneId: number) {
    setPanier((prev) => prev.filter((p) => p.ligneId !== ligneId));
  }

  return (
    <Dialog open={ouvert} onOpenChange={changerOuverture}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle vente</DialogTitle>
          <DialogDescription>
            Ajoutez chaque boisson du client au panier. Le montant total se calcule
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        {aucunStock && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Aucune boisson n’a de stock disponible (dispo : 0). Ajoutez d’abord du stock
              via la colonne <strong>Commande</strong> du registre ou le menu{" "}
              <strong>Achats</strong>, puis revenez enregistrer la vente.
            </span>
          </div>
        )}

        {/* Ligne d'ajout : boisson + quantité + bouton Ajouter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="vente-boisson" className="mb-1 block text-sm font-medium">
              Boisson
            </label>
            <select
              id="vente-boisson"
              value={boissonId}
              onChange={(e) => setBoissonId(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">— Sélectionner —</option>
              {lignes.map((l) => {
                const dispo = l.stockRestant != null ? l.stockRestant : l.nouveauStock;
                return (
                  <option key={l.id} value={l.id} disabled={dispo <= 0}>
                    {l.designation} — {formatFCFA(l.prixUnitaire)} (dispo : {dispo})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="w-full sm:w-24">
            <label htmlFor="vente-quantite" className="mb-1 block text-sm font-medium">
              Qté
            </label>
            <Input
              id="vente-quantite"
              type="number"
              min={1}
              inputMode="numeric"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={ajouterAuPanier}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        {ligne && (
          <p className="-mt-1 text-xs text-muted-foreground">
            Stock disponible : {resteDisponible}
            {quantiteValide && ` · sous-total : ${formatFCFA(sousTotalLigne)}`}
          </p>
        )}
        {erreurLocale && (
          <p className="text-xs font-medium text-destructive">{erreurLocale}</p>
        )}

        {/* Le panier */}
        <div className="rounded-md border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-secondary px-3 py-2 text-sm font-semibold">
            <ShoppingCart className="h-4 w-4" /> Panier
            {totalArticles > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {totalArticles} article(s)
              </Badge>
            )}
          </div>
          {panier.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucune boisson ajoutée pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {panier.map((p) => (
                <li key={p.ligneId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{p.designation}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.quantite} × {formatFCFA(p.prixUnitaire)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatFCFA(p.prixUnitaire * p.quantite)}
                  </span>
                  <button
                    type="button"
                    onClick={() => retirerDuPanier(p.ligneId)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Montant total calculé automatiquement */}
        <div className="flex items-center justify-between rounded-md bg-secondary px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Montant total</span>
          <span className="text-2xl font-bold tabular-nums">{formatFCFA(totalPanier)}</span>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => onValider(panier)}
            disabled={enCours || panier.length === 0}
          >
            {enCours ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Enregistrer la vente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LigneRow({
  ligne: l,
  edit,
  cloture,
  saving,
  onChange,
  onBlur,
  onVendre,
}: {
  ligne: LigneRegistre;
  edit?: { commande: string; vendu: string; perdu: string };
  cloture: boolean;
  saving: boolean;
  onChange: (champ: "commande" | "vendu" | "perdu", val: string) => void;
  onBlur: () => void;
  onVendre: () => void;
}) {
  const fond = l.rupture
    ? "bg-destructive/5"
    : l.alerteStockBas
    ? "bg-warning/5"
    : "";

  // Stock encore disponible à la vente (restant, ou nouveau stock si rien vendu).
  const disponible = l.stockRestant != null ? l.stockRestant : l.nouveauStock;

  return (
    <tr className={`border-b border-border ${fond}`}>
      <td className="sticky left-0 z-10 bg-card px-3 py-2">
        <div className="flex items-center gap-2 font-medium">
          {l.designation}
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {l.rupture ? (
          <Badge variant="destructive" className="mt-1 gap-1">
            <XCircle className="h-3 w-3" /> Rupture
          </Badge>
        ) : l.alerteStockBas ? (
          <Badge variant="warning" className="mt-1 gap-1">
            <AlertTriangle className="h-3 w-3" /> Stock bas
          </Badge>
        ) : null}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{l.ancienStock}</td>
      <td className="px-3 py-2 text-right">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          className="ml-auto h-10 w-20 text-right"
          value={edit?.commande ?? ""}
          disabled={cloture}
          onChange={(e) => onChange("commande", e.target.value)}
          onBlur={onBlur}
        />
      </td>
      <td className="px-3 py-2 text-right font-medium tabular-nums">{l.nouveauStock}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-1.5">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            className="h-10 w-20 text-right"
            value={edit?.vendu ?? ""}
            disabled={cloture}
            onChange={(e) => onChange("vendu", e.target.value)}
            onBlur={onBlur}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0"
            title="Enregistrer une vente"
            disabled={cloture || saving || disponible <= 0}
            onClick={onVendre}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          title="Bouteilles perdues (casse, périmé, offert...)"
          className={`mx-auto h-10 w-20 text-right ${
            l.stockPerdu > 0 ? "border-warning text-warning" : ""
          }`}
          value={edit?.perdu ?? ""}
          disabled={cloture}
          onChange={(e) => onChange("perdu", e.target.value)}
          onBlur={onBlur}
        />
      </td>
      <td className="px-3 py-2 text-right font-medium tabular-nums text-muted-foreground">
        {l.stockRestant != null ? l.stockRestant : l.nouveauStock}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {formatFCFA(l.prixUnitaire)}
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums">
        {l.prixVenteTotal != null ? formatFCFA(l.prixVenteTotal) : "—"}
      </td>
    </tr>
  );
}

/** Rendu mobile d'une ligne du registre sous forme de carte (champs empilés, gros boutons). */
function LigneCard({
  ligne: l,
  edit,
  cloture,
  saving,
  onChange,
  onBlur,
  onVendre,
}: {
  ligne: LigneRegistre;
  edit?: { commande: string; vendu: string; perdu: string };
  cloture: boolean;
  saving: boolean;
  onChange: (champ: "commande" | "vendu" | "perdu", val: string) => void;
  onBlur: () => void;
  onVendre: () => void;
}) {
  const fond = l.rupture
    ? "border-destructive/40 bg-destructive/5"
    : l.alerteStockBas
    ? "border-warning/40 bg-warning/5"
    : "border-border";

  const disponible = l.stockRestant != null ? l.stockRestant : l.nouveauStock;
  const restant = l.stockRestant != null ? l.stockRestant : l.nouveauStock;

  return (
    <div className={`space-y-3 rounded-lg border p-4 ${fond}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          {l.designation}
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {l.rupture ? (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Rupture
          </Badge>
        ) : l.alerteStockBas ? (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Stock bas
          </Badge>
        ) : null}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Ancien :{" "}
          <span className="font-medium tabular-nums text-foreground">{l.ancienStock}</span>
        </span>
        <span>
          Nouveau :{" "}
          <span className="font-medium tabular-nums text-foreground">{l.nouveauStock}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Commande</label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            className="h-12 text-right"
            value={edit?.commande ?? ""}
            disabled={cloture}
            onChange={(e) => onChange("commande", e.target.value)}
            onBlur={onBlur}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Perte</label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            className={`h-12 text-right ${l.stockPerdu > 0 ? "border-warning text-warning" : ""}`}
            value={edit?.perdu ?? ""}
            disabled={cloture}
            onChange={(e) => onChange("perdu", e.target.value)}
            onBlur={onBlur}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Vendu</label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            className="h-12 flex-1 text-right"
            value={edit?.vendu ?? ""}
            disabled={cloture}
            onChange={(e) => onChange("vendu", e.target.value)}
            onBlur={onBlur}
          />
          <Button
            type="button"
            className="h-12 w-16 shrink-0"
            title="Enregistrer une vente"
            disabled={cloture || saving || disponible <= 0}
            onClick={onVendre}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          Restant{" "}
          <span className="ml-1 text-lg font-semibold tabular-nums text-foreground">
            {restant}
          </span>
        </span>
        <span className="font-semibold tabular-nums">
          {l.prixVenteTotal != null ? formatFCFA(l.prixVenteTotal) : "—"}
        </span>
      </div>
    </div>
  );
}
