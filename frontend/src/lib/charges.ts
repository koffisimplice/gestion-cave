import { apiFetch } from "@/lib/api";
import type { Charge, ChargeInput, Rentabilite } from "@/types";

export function listerCharges(
  annee: number,
  mois: number,
  etablissementId?: number | null
) {
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

export function getRentabilite(
  annee: number,
  mois: number,
  etablissementId?: number | null
) {
  const params = new URLSearchParams({ annee: String(annee), mois: String(mois) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<Rentabilite>(`/api/charges/rentabilite?${params.toString()}`);
}
