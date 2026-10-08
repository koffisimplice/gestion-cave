import { apiFetch, apiDownload, apiUpload } from "@/lib/api";
import type { SauvegardeFichier } from "@/types";

export function listerSauvegardes() {
  return apiFetch<SauvegardeFichier[]>("/api/sauvegardes");
}

export function sauvegarderMaintenant() {
  return apiFetch<SauvegardeFichier>("/api/sauvegardes", { method: "POST" });
}

export function telechargerExport() {
  const nom = `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  return apiDownload("/api/sauvegardes/export", nom);
}

export function telechargerSauvegarde(nom: string) {
  return apiDownload(`/api/sauvegardes/${encodeURIComponent(nom)}`, nom);
}

export function restaurerStockee(nom: string) {
  return apiFetch<{ message: string }>(
    `/api/sauvegardes/restaurer/${encodeURIComponent(nom)}`,
    { method: "POST" }
  );
}

export function restaurerDepuisFichier(fichier: File) {
  const form = new FormData();
  form.append("fichier", fichier);
  return apiUpload<{ message: string }>("/api/sauvegardes/restaurer", form);
}
