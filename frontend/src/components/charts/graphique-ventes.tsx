"use client";

import { useRef, useState } from "react";
import type { PointVenteJour } from "@/types";
import { formatFCFA, formatNombre } from "@/lib/utils";

// Repère interne du SVG (mis à l'échelle en largeur 100% via viewBox).
const W = 800;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 58 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Format compact pour l'axe (ex. 1,2M / 450k / 800). */
function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace(".", ",")}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function jourCourt(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/**
 * Courbe de tendance mono-série (chiffre d'affaires par jour). Aire + ligne en
 * couleur primaire, grille discrète, survol avec repère vertical et infobulle.
 */
export function GraphiqueVentes({ points }: { points: PointVenteJour[] }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [actif, setActif] = useState<number | null>(null);

  const n = points.length;
  const maxCa = Math.max(1, ...points.map((p) => p.chiffreAffaires));
  // Arrondit le plafond à un "beau" nombre pour des graduations lisibles.
  const plafond = arrondiHaut(maxCa);

  const x = (i: number) => PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) => PAD.top + (1 - v / plafond) * PLOT_H;

  const ligne = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.chiffreAffaires).toFixed(1)}`).join(" ");
  const aire = `${ligne} L ${x(n - 1).toFixed(1)} ${PAD.top + PLOT_H} L ${x(0).toFixed(1)} ${PAD.top + PLOT_H} Z`;

  const graduations = [0, 0.5, 1].map((f) => f * plafond);
  const pasEtiquettes = Math.max(1, Math.ceil(n / 6)); // ~6 dates max en abscisse

  function surMouvement(e: React.MouseEvent) {
    const rect = conteneurRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const ux = ((e.clientX - rect.left) / rect.width) * W; // vers le repère interne
    const frac = (ux - PAD.left) / PLOT_W;
    const i = Math.round(Math.min(1, Math.max(0, frac)) * (n - 1));
    setActif(i);
  }

  const toutAZero = points.every((p) => p.chiffreAffaires === 0);

  return (
    <div className="relative" ref={conteneurRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Courbe du chiffre d'affaires quotidien"
        onMouseMove={surMouvement}
        onMouseLeave={() => setActif(null)}
      >
        {/* Grille horizontale + étiquettes Y */}
        {graduations.map((g, idx) => (
          <g key={idx}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(g)}
              y2={y(g)}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(g)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fill="hsl(var(--muted-foreground))"
            >
              {compact(g)}
            </text>
          </g>
        ))}

        {/* Étiquettes X (dates) */}
        {points.map((p, i) =>
          i % pasEtiquettes === 0 || i === n - 1 ? (
            <text
              key={p.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize={12}
              fill="hsl(var(--muted-foreground))"
            >
              {jourCourt(p.date)}
            </text>
          ) : null
        )}

        {/* Aire + ligne (couleur primaire) */}
        <path d={aire} fill="hsl(var(--primary))" fillOpacity={0.12} />
        <path
          d={ligne}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Repère de survol */}
        {actif != null && (
          <g>
            <line
              x1={x(actif)}
              x2={x(actif)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="hsl(var(--primary))"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <circle
              cx={x(actif)}
              cy={y(points[actif].chiffreAffaires)}
              r={5}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--card))"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {toutAZero && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
            Aucune vente sur la période
          </span>
        </div>
      )}

      {/* Infobulle HTML positionnée sur le point actif */}
      {actif != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md"
          style={{
            left: `${(x(actif) / W) * 100}%`,
            top: `${(y(points[actif].chiffreAffaires) / H) * 100}%`,
            marginTop: -8,
          }}
        >
          <div className="font-medium">{jourCourt(points[actif].date)}</div>
          <div className="mt-0.5 tabular-nums text-foreground">
            {formatFCFA(points[actif].chiffreAffaires)}
          </div>
          <div className="tabular-nums text-muted-foreground">
            {formatNombre(points[actif].quantite)} bouteille(s)
          </div>
        </div>
      )}
    </div>
  );
}

/** Arrondit un plafond d'axe vers un nombre "propre" (1/2/5 × 10ⁿ). */
function arrondiHaut(v: number): number {
  if (v <= 0) return 1;
  const ordre = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / ordre;
  const pas = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return pas * ordre;
}
