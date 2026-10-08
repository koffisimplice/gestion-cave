import { apiFetch } from "@/lib/api";
import type { CommandeFournisseur, CommandeInput } from "@/types";

export function listerCommandes(etablissementId?: number | null) {
  const query = etablissementId ? `?etablissementId=${etablissementId}` : "";
  return apiFetch<CommandeFournisseur[]>(`/api/commandes${query}`);
}

export function creerCommande(input: CommandeInput) {
  return apiFetch<CommandeFournisseur>("/api/commandes", {
    method: "POST",
    body: input,
  });
}

export function supprimerCommande(id: number) {
  return apiFetch<void>(`/api/commandes/${id}`, { method: "DELETE" });
}
