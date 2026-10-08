import { apiFetch, apiDownload } from "@/lib/api";
import type { LigneHistorique, PointVenteJour, TableauBord } from "@/types";

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

export function telechargerRapport(
  format: "pdf" | "excel",
  annee: number,
  mois: number,
  etablissementId?: number | null
) {
  const params = new URLSearchParams({ annee: String(annee), mois: String(mois) });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  const ext = format === "excel" ? "xlsx" : "pdf";
  const nom = `rapport-${annee}-${String(mois).padStart(2, "0")}.${ext}`;
  return apiDownload(
    `/api/tableau-de-bord/rapport/${format}?${params.toString()}`,
    nom
  );
}
