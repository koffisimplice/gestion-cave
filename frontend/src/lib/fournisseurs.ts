import { apiFetch } from "@/lib/api";
import type { Fournisseur, FournisseurInput } from "@/types";

export function listerFournisseurs() {
  return apiFetch<Fournisseur[]>("/api/fournisseurs");
}

export function creerFournisseur(input: FournisseurInput) {
  return apiFetch<Fournisseur>("/api/fournisseurs", {
    method: "POST",
    body: input,
  });
}

export function modifierFournisseur(id: number, input: FournisseurInput) {
  return apiFetch<Fournisseur>(`/api/fournisseurs/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function supprimerFournisseur(id: number) {
  return apiFetch<void>(`/api/fournisseurs/${id}`, { method: "DELETE" });
}
