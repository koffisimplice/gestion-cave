"use client";

import type { BoissonVendue } from "@/types";
import { formatFCFA, formatNombre } from "@/lib/utils";

/**
 * Classement des meilleures ventes en barres horizontales (magnitude par
 * quantité vendue). Mono-métrique → une seule teinte (primaire) ; le CA est
 * affiché en étiquette directe à côté de chaque barre.
 */
export function GraphiqueBarresBoissons({ boissons }: { boissons: BoissonVendue[] }) {
  const max = Math.max(1, ...boissons.map((b) => b.quantiteVendue));

  return (
    <ol className="space-y-3">
      {boissons.map((b, i) => (
        <li key={b.boissonId} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {i + 1}
              </span>
              <span className="truncate font-medium">{b.designation}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatFCFA(b.chiffreAffaires)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(b.quantiteVendue / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
              {formatNombre(b.quantiteVendue)} btl
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
