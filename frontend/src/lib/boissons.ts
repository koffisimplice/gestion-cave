import { apiFetch } from "@/lib/api";
import type { Boisson, BoissonInput } from "@/types";

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
