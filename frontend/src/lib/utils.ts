import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un montant en francs CFA (XOF). */
export function formatFCFA(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(Math.round(montant)) + " FCFA";
}

/** Formate un nombre simple (quantités). */
export function formatNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
