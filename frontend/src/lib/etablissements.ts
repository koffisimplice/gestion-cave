import { apiFetch } from "@/lib/api";
import type { Etablissement, EtablissementInput } from "@/types";

export function listerEtablissements() {
  return apiFetch<Etablissement[]>("/api/etablissements");
}

export function creerEtablissement(input: EtablissementInput) {
  return apiFetch<Etablissement>("/api/etablissements", {
    method: "POST",
    body: input,
  });
}

export function modifierEtablissement(id: number, input: EtablissementInput) {
  return apiFetch<Etablissement>(`/api/etablissements/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function desactiverEtablissement(id: number) {
  return apiFetch<void>(`/api/etablissements/${id}`, { method: "DELETE" });
}
