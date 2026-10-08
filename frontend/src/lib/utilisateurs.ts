import { apiFetch } from "@/lib/api";
import type { UtilisateurAdmin, UtilisateurInput } from "@/types";

export function listerUtilisateurs() {
  return apiFetch<UtilisateurAdmin[]>("/api/utilisateurs");
}

export function creerUtilisateur(input: UtilisateurInput) {
  return apiFetch<UtilisateurAdmin>("/api/utilisateurs", {
    method: "POST",
    body: input,
  });
}

export function modifierUtilisateur(id: number, input: UtilisateurInput) {
  return apiFetch<UtilisateurAdmin>(`/api/utilisateurs/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function changerActivationUtilisateur(id: number, actif: boolean) {
  return apiFetch<UtilisateurAdmin>(
    `/api/utilisateurs/${id}/activation?actif=${actif}`,
    { method: "PUT" }
  );
}
