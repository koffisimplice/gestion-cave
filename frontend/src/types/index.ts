export type Role = "PROPRIETAIRE" | "GERANT";

export interface EtablissementResume {
  id: number;
  nom: string;
}

export interface Etablissement {
  id: number;
  nom: string;
  adresse: string | null;
  responsable: string | null;
  actif: boolean;
}

export interface EtablissementInput {
  nom: string;
  adresse?: string;
  responsable?: string;
}

export type TypeConditionnement = "CASIER" | "CARTON" | "PACK" | "FUT" | "UNITE";

/** Libellés (singulier/pluriel) de chaque type de conditionnement, pour l'affichage. */
export const CONDITIONNEMENTS: Record<
  TypeConditionnement,
  { singulier: string; pluriel: string }
> = {
  CASIER: { singulier: "casier", pluriel: "casiers" },
  CARTON: { singulier: "carton", pluriel: "cartons" },
  PACK: { singulier: "pack", pluriel: "packs" },
  FUT: { singulier: "fût", pluriel: "fûts" },
  UNITE: { singulier: "unité", pluriel: "unités" },
};

/**
 * Libellés d'un conditionnement, avec repli sur « casier » si le type est
 * absent (ex. données d'un backend pas encore migré).
 */
export function libellesConditionnement(type: TypeConditionnement | null | undefined) {
  return CONDITIONNEMENTS[type ?? "CASIER"] ?? CONDITIONNEMENTS.CASIER;
}

export interface Boisson {
  id: number;
  designation: string;
  typeConditionnement: TypeConditionnement;
  typeConditionnementLibelle: string;
  bouteillesParConditionnement: number;
  prixVenteUnitaire: number;
  seuilAlerte: number;
  categorie: string | null;
  photoUrl: string | null;
  actif: boolean;
  etablissements: Etablissement[];
  // Réservés au propriétaire (null pour un gérant) :
  prixAchatCasier: number | null;
  prixRevientUnitaire: number | null;
}

export interface BoissonInput {
  designation: string;
  typeConditionnement: TypeConditionnement;
  bouteillesParConditionnement: number;
  prixAchatCasier: number;
  prixVenteUnitaire: number;
  seuilAlerte: number;
  categorie?: string;
  photoUrl?: string;
  etablissementIds: number[];
}

export type StatutRegistre = "OUVERT" | "CLOTURE";

export interface LigneRegistre {
  id: number;
  boissonId: number;
  designation: string;
  categorie: string | null;
  ancienStock: number;
  commandeDuJour: number;
  nouveauStock: number;
  stockRestant: number | null;
  stockVendu: number | null;
  stockPerdu: number;
  motifPerte: string | null;
  prixUnitaire: number;
  prixVenteTotal: number | null;
  seuilAlerte: number;
  statut: StatutRegistre;
  alerteStockBas: boolean;
  rupture: boolean;
}

export interface PointJournalier {
  etablissementId: number;
  date: string;
  statut: StatutRegistre;
  totalVendu: number;
  totalPerdu: number;
  totalPrixVenteTotal: number;
  lignes: LigneRegistre[];
}

export interface CommandeFournisseur {
  id: number;
  boissonId: number;
  designation: string;
  etablissementId: number;
  etablissementNom: string;
  date: string;
  typeConditionnement: TypeConditionnement;
  typeConditionnementLibelle: string;
  typeConditionnementLibellePluriel: string;
  nombreCasiers: number;
  bouteillesParCasier: number;
  bouteillesAjoutees: number;
  fournisseur: string | null;
  fournisseurId: number | null;
  // Réservés au propriétaire (null pour un gérant) :
  prixAchatCasier: number | null;
  montantTotal: number | null;
}

export interface CommandeInput {
  boissonId: number;
  etablissementId: number;
  date?: string;
  nombreCasiers: number;
  fournisseur?: string;
  fournisseurId?: number;
  prixAchatCasier?: number;
}

export interface JournalAudit {
  id: number;
  dateHeure: string;
  utilisateurId: number | null;
  acteur: string;
  action: string;
  cible: string | null;
  details: string | null;
}

export interface Fournisseur {
  id: number;
  nom: string;
  telephone: string | null;
  contact: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
  nombreAchats: number;
  montantTotalAchats: number | null;
}

export interface FournisseurInput {
  nom: string;
  telephone?: string;
  contact?: string;
  adresse?: string;
  notes?: string;
}

export interface LigneMarge {
  boissonId: number;
  designation: string;
  categorie: string | null;
  quantiteVendue: number;
  chiffreAffaires: number;
  prixRevientUnitaire: number;
  prixVenteUnitaire: number;
  margeUnitaire: number;
  benefice: number;
  stockRestant: number;
  valorisationStockRevient: number;
  valorisationStockVente: number;
}

export interface AnalyseMarge {
  etablissementId: number | null;
  debut: string;
  fin: string;
  totalQuantiteVendue: number;
  chiffreAffaires: number;
  beneficeBrut: number;
  valorisationStockRevient: number;
  valorisationStockVente: number;
  lignes: LigneMarge[];
}

export type CategorieCharge = "VARIABLE" | "FIXE" | "OBLIGATOIRE" | "SALAIRE";
export type Periodicite =
  | "PONCTUELLE"
  | "HEBDOMADAIRE"
  | "MENSUELLE"
  | "TRIMESTRIELLE"
  | "ANNUELLE";

export interface Charge {
  id: number;
  etablissementId: number;
  etablissementNom: string;
  categorie: CategorieCharge;
  libelle: string;
  montant: number;
  periodicite: Periodicite;
  annee: number;
  mois: number;
}

export interface ChargeInput {
  etablissementId: number;
  categorie: CategorieCharge;
  libelle: string;
  montant: number;
  periodicite: Periodicite;
  annee: number;
  mois: number;
}

export interface TotalCategorie {
  categorie: CategorieCharge;
  montant: number;
}

export interface Rentabilite {
  etablissementId: number | null;
  annee: number;
  mois: number;
  chiffreAffaires: number;
  beneficeBrut: number;
  totalCharges: number;
  chargesParCategorie: TotalCategorie[];
  beneficeNet: number;
  beneficiaire: boolean;
  tauxMarge: number;
  chiffreAffairesSeuil: number | null;
  charges: Charge[];
}

// ----- Personnel & Paie -----

export interface Employe {
  id: number;
  etablissementId: number;
  etablissementNom: string;
  nom: string;
  poste: string | null;
  salaireMensuel: number;
  telephone: string | null;
  dateEmbauche: string | null;
  actif: boolean;
}

export interface EmployeInput {
  etablissementId: number;
  nom: string;
  poste?: string;
  salaireMensuel: number;
  telephone?: string;
  dateEmbauche?: string | null;
}

export interface LignePaie {
  employeId: number;
  nom: string;
  poste: string | null;
  etablissementId: number;
  etablissementNom: string;
  salaireMensuel: number;
  paye: boolean;
  paiementId: number | null;
  montantPaye: number | null;
  datePaiement: string | null;
}

export interface PaiementInput {
  employeId: number;
  annee: number;
  mois: number;
  montant: number;
  datePaiement: string;
}

export interface VenteResume {
  quantite: number;
  chiffreAffaires: number;
}

export interface BoissonVendue {
  boissonId: number;
  designation: string;
  quantiteVendue: number;
  chiffreAffaires: number;
}

export interface TableauBord {
  etablissementId: number | null;
  date: string;
  annee: number;
  mois: number;
  ventesDuJour: VenteResume;
  ventesDuMois: VenteResume;
  stockTotal: number;
  nbBoissons: number;
  nbStockBas: number;
  nbRuptures: number;
  meilleuresVentes: BoissonVendue[];
  // Réservés au propriétaire (null pour un gérant) :
  beneficeBrutMois: number | null;
  totalChargesMois: number | null;
  beneficeNetMois: number | null;
  beneficiaire: boolean | null;
}

export interface PointVenteJour {
  date: string;
  quantite: number;
  chiffreAffaires: number;
}

export interface LigneHistorique {
  id: number;
  date: string;
  etablissementId: number;
  etablissementNom: string;
  boissonId: number;
  designation: string;
  ancienStock: number;
  commandeDuJour: number;
  nouveauStock: number;
  stockRestant: number | null;
  stockVendu: number | null;
  prixUnitaire: number;
  prixVenteTotal: number | null;
  statut: StatutRegistre;
}

export interface SauvegardeFichier {
  nom: string;
  tailleOctets: number;
  creeLe: string;
}

export interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: Role;
  etablissements: EtablissementResume[];
}

/** Vue d'administration d'un utilisateur (gestion des comptes). */
export interface UtilisateurAdmin {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  role: Role;
  actif: boolean;
  etablissements: EtablissementResume[];
}

export interface UtilisateurInput {
  nom: string;
  email: string;
  telephone?: string;
  role: Role;
  motDePasse?: string;
  etablissementIds: number[];
}

export interface LoginResponse {
  token: string;
  typeToken: string;
  expiresInMs: number;
  utilisateur: Utilisateur;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}
