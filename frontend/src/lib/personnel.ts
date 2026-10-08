import { apiFetch } from "@/lib/api";
import type { Employe, EmployeInput, LignePaie, PaiementInput } from "@/types";

// ----- Employés -----

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

// ----- Paie -----

export function getEtatPaie(
  annee: number,
  mois: number,
  etablissementId?: number | null
) {
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
