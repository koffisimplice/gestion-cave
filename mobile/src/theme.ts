/**
 * Palette et tokens de design de l'app mobile Gestion Cave.
 * Reprend l'esprit « bleu ardoise sobre » du frontend web.
 */
export const colors = {
  background: "#0f172a", // slate-900 (fond principal, sombre)
  surface: "#1e293b", // slate-800 (cartes)
  surfaceAlt: "#273449", // légèrement plus clair
  border: "#334155", // slate-700
  primary: "#3b82f6", // blue-500
  primaryDark: "#2563eb", // blue-600
  text: "#f1f5f9", // slate-100
  textMuted: "#94a3b8", // slate-400
  textFaint: "#64748b", // slate-500
  success: "#22c55e", // green-500
  successBg: "#052e16",
  danger: "#ef4444", // red-500
  dangerBg: "#450a0a",
  warning: "#f59e0b", // amber-500
  warningBg: "#451a03",
  white: "#ffffff",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

/** Formate un montant en francs CFA (FCFA), séparateurs d'espace. */
export function formatMontant(valeur: number | null | undefined): string {
  if (valeur == null) return "—";
  return (
    Math.round(valeur)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA"
  );
}

/** Formate un nombre entier avec séparateurs d'espace. */
export function formatNombre(valeur: number | null | undefined): string {
  if (valeur == null) return "—";
  return valeur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Date du jour au format ISO yyyy-MM-dd (fuseau local). */
export function dateDuJour(): string {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/** Affiche une date ISO (yyyy-MM-dd ou datetime) en format court fr. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
