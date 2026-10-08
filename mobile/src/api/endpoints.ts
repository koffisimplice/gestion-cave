import { apiFetch } from "@/api/client";
import type {
  AnalyseMarge,
  Boisson,
  BoissonInput,
  Charge,
  ChargeInput,
  CommandeFournisseur,
  CommandeInput,
  Employe,
  EmployeInput,
  Etablissement,
  EtablissementInput,
  Fournisseur,
  FournisseurInput,
  JournalAudit,
  LigneHistorique,
  LignePaie,
  LoginResponse,
  PaiementInput,
  PointJournalier,
  PointVenteJour,
  Rentabilite,
  TableauBord,
  Utilisateur,
  UtilisateurAdmin,
  UtilisateurInput,
} from "@/types";

// ---------- Auth ----------

export function login(email: string, motDePasse: string) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, motDePasse },
  });
}

export function getMoi() {
  return apiFetch<Utilisateur>("/api/auth/me");
}

// ---------- Établissements ----------

export function listerEtablissements() {
  return apiFetch<Etablissement[]>("/api/etablissements");
}

export function creerEtablissement(input: EtablissementInput) {
  return apiFetch<Etablissement>("/api/etablissements", { method: "POST", body: input });
}

export function modifierEtablissement(id: number, input: EtablissementInput) {
  return apiFetch<Etablissement>(`/api/etablissements/${id}`, { method: "PUT", body: input });
}

export function desactiverEtablissement(id: number) {
  return apiFetch<void>(`/api/etablissements/${id}`, { method: "DELETE" });
}

// ---------- Tableau de bord ----------

export function getSynthese(etablissementId?: number | null, date?: string) {
  const params = new URLSearchParams();
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  if (date) params.set("date", date);
  const q = params.toString();
  return apiFetch<TableauBord>(`/api/tableau-de-bord${q ? `?${q}` : ""}`);
}

export function getTendance(etablissementId?: number | null, jours = 30) {
  const params = new URLSearchParams({ jours: String(jours) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<PointVenteJour[]>(`/api/tableau-de-bord/tendance?${params.toString()}`);
}

export function getHistorique(
  debut: string,
  fin: string,
  etablissementId?: number | null,
  boissonId?: number | null
) {
  const params = new URLSearchParams({ debut, fin });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  if (boissonId) params.set("boissonId", String(boissonId));
  return apiFetch<LigneHistorique[]>(`/api/tableau-de-bord/historique?${params.toString()}`);
}

// ---------- Registre ----------

export function getPointDuJour(etablissementId: number, date: string) {
  return apiFetch<PointJournalier>(
    `/api/registre?etablissementId=${etablissementId}&date=${date}`
  );
}

export function majLigne(
  ligneId: number,
  commandeDuJour: number,
  stockVendu: number | null,
  stockPerdu = 0,
  motifPerte: string | null = null
) {
  return apiFetch<PointJournalier>(`/api/registre/lignes/${ligneId}`, {
    method: "PUT",
    body: { commandeDuJour, stockVendu, stockPerdu, motifPerte },
  });
}

export function enregistrerVente(ligneId: number, quantite = 1) {
  return apiFetch<PointJournalier>(
    `/api/registre/lignes/${ligneId}/vente?quantite=${quantite}`,
    { method: "POST" }
  );
}

export function cloturerPoint(etablissementId: number, date: string) {
  return apiFetch<PointJournalier>(
    `/api/registre/cloturer?etablissementId=${etablissementId}&date=${date}`,
    { method: "POST" }
  );
}

// ---------- Boissons ----------

export function listerBoissons(etablissementId?: number | null) {
  const query = etablissementId ? `?etablissementId=${etablissementId}` : "";
  return apiFetch<Boisson[]>(`/api/boissons${query}`);
}

export function creerBoisson(input: BoissonInput) {
  return apiFetch<Boisson>("/api/boissons", { method: "POST", body: input });
}

export function modifierBoisson(id: number, input: BoissonInput) {
  return apiFetch<Boisson>(`/api/boissons/${id}`, { method: "PUT", body: input });
}

export function desactiverBoisson(id: number) {
  return apiFetch<void>(`/api/boissons/${id}`, { method: "DELETE" });
}

// ---------- Commandes / achats ----------

export function listerCommandes(etablissementId?: number | null) {
  const query = etablissementId ? `?etablissementId=${etablissementId}` : "";
  return apiFetch<CommandeFournisseur[]>(`/api/commandes${query}`);
}

export function creerCommande(input: CommandeInput) {
  return apiFetch<CommandeFournisseur>("/api/commandes", { method: "POST", body: input });
}

export function supprimerCommande(id: number) {
  return apiFetch<void>(`/api/commandes/${id}`, { method: "DELETE" });
}

// ---------- Fournisseurs ----------

export function listerFournisseurs() {
  return apiFetch<Fournisseur[]>("/api/fournisseurs");
}

export function creerFournisseur(input: FournisseurInput) {
  return apiFetch<Fournisseur>("/api/fournisseurs", { method: "POST", body: input });
}

export function modifierFournisseur(id: number, input: FournisseurInput) {
  return apiFetch<Fournisseur>(`/api/fournisseurs/${id}`, { method: "PUT", body: input });
}

export function supprimerFournisseur(id: number) {
  return apiFetch<void>(`/api/fournisseurs/${id}`, { method: "DELETE" });
}

// ---------- Marges / analyse ----------

export function analyserMarges(debut: string, fin: string, etablissementId?: number | null) {
  const params = new URLSearchParams({ debut, fin });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<AnalyseMarge>(`/api/analyse/marges?${params.toString()}`);
}

// ---------- Charges / rentabilité ----------

export function listerCharges(annee: number, mois: number, etablissementId?: number | null) {
  const params = new URLSearchParams({ annee: String(annee), mois: String(mois) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<Charge[]>(`/api/charges?${params.toString()}`);
}

export function creerCharge(input: ChargeInput) {
  return apiFetch<Charge>("/api/charges", { method: "POST", body: input });
}

export function modifierCharge(id: number, input: ChargeInput) {
  return apiFetch<Charge>(`/api/charges/${id}`, { method: "PUT", body: input });
}

export function supprimerCharge(id: number) {
  return apiFetch<void>(`/api/charges/${id}`, { method: "DELETE" });
}

export function getRentabilite(annee: number, mois: number, etablissementId?: number | null) {
  const params = new URLSearchParams({ annee: String(annee), mois: String(mois) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<Rentabilite>(`/api/charges/rentabilite?${params.toString()}`);
}

// ---------- Personnel & paie ----------

export function listerEmployes(etablissementId?: number | null) {
  const params = new URLSearchParams();
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  const qs = params.toString();
  return apiFetch<Employe[]>(`/api/personnel/employes${qs ? `?${qs}` : ""}`);
}

export function creerEmploye(input: EmployeInput) {
  return apiFetch<Employe>("/api/personnel/employes", { method: "POST", body: input });
}

export function modifierEmploye(id: number, input: EmployeInput) {
  return apiFetch<Employe>(`/api/personnel/employes/${id}`, { method: "PUT", body: input });
}

export function supprimerEmploye(id: number) {
  return apiFetch<void>(`/api/personnel/employes/${id}`, { method: "DELETE" });
}

export function getEtatPaie(annee: number, mois: number, etablissementId?: number | null) {
  const params = new URLSearchParams({ annee: String(annee), mois: String(mois) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<LignePaie[]>(`/api/personnel/paie?${params.toString()}`);
}

export function payerSalaire(input: PaiementInput) {
  return apiFetch<LignePaie>("/api/personnel/paie", { method: "POST", body: input });
}

export function annulerPaiement(paiementId: number) {
  return apiFetch<void>(`/api/personnel/paie/${paiementId}`, { method: "DELETE" });
}

// ---------- Utilisateurs (admin) ----------

export function listerUtilisateurs() {
  return apiFetch<UtilisateurAdmin[]>("/api/utilisateurs");
}

export function creerUtilisateur(input: UtilisateurInput) {
  return apiFetch<UtilisateurAdmin>("/api/utilisateurs", { method: "POST", body: input });
}

export function modifierUtilisateur(id: number, input: UtilisateurInput) {
  return apiFetch<UtilisateurAdmin>(`/api/utilisateurs/${id}`, { method: "PUT", body: input });
}

export function changerActivationUtilisateur(id: number, actif: boolean) {
  return apiFetch<UtilisateurAdmin>(
    `/api/utilisateurs/${id}/activation?actif=${actif}`,
    { method: "PUT" }
  );
}

// ---------- Audit ----------

export function listerAudit(action?: string, limite = 200) {
  const params = new URLSearchParams({ limite: String(limite) });
  if (action) params.set("action", action);
  return apiFetch<JournalAudit[]>(`/api/audit?${params.toString()}`);
}
