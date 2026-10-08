import { apiFetch } from "@/lib/api";
import type { AnalyseMarge } from "@/types";

export function analyserMarges(
  debut: string,
  fin: string,
  etablissementId?: number | null
) {
  const params = new URLSearchParams({ debut, fin });
  if (etablissementId) params.set("etablissementId", String(etablissementId));
  return apiFetch<AnalyseMarge>(`/api/analyse/marges?${params.toString()}`);
}
