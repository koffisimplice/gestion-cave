import { apiFetch } from "@/lib/api";
import type { PointJournalier } from "@/types";

export function getPointDuJour(etablissementId: number, date: string) {
  return apiFetch<PointJournalier>(
    `/api/registre?etablissementId=${etablissementId}&date=${date}`
  );
}

export function majLigne(
  ligneId: number,
  commandeDuJour: number,
  stockVendu: number | null,
  stockPerdu = 0,
  motifPerte: string | null = null
) {
  return apiFetch<PointJournalier>(`/api/registre/lignes/${ligneId}`, {
    method: "PUT",
    body: { commandeDuJour, stockVendu, stockPerdu, motifPerte },
  });
}

/** Enregistre une vente (bouton +1) : incrémente le stock vendu de la ligne. */
export function enregistrerVente(ligneId: number, quantite = 1) {
  return apiFetch<PointJournalier>(
    `/api/registre/lignes/${ligneId}/vente?quantite=${quantite}`,
    { method: "POST" }
  );
}

export function cloturerPoint(etablissementId: number, date: string) {
  return apiFetch<PointJournalier>(
    `/api/registre/cloturer?etablissementId=${etablissementId}&date=${date}`,
    { method: "POST" }
  );
}
