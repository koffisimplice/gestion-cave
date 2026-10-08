"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Wine,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  Wallet,
  History,
  DatabaseBackup,
  Users,
  HandCoins,
  Truck,
  ShieldCheck,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proprietaireSeulement?: boolean;
}

interface NavGroup {
  titre: string;
  items: NavItem[];
}

const GROUPES: NavGroup[] = [
  {
    titre: "Opérations",
    items: [
      { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/registre", label: "Registre du jour", icon: ClipboardList },
      { href: "/achats", label: "Achats", icon: ShoppingCart },
      { href: "/historique", label: "Historique", icon: History },
      { href: "/boissons", label: "Boissons", icon: Wine },
    ],
  },
  {
    titre: "Finances",
    items: [
      { href: "/marges", label: "Marges & bénéfices", icon: TrendingUp, proprietaireSeulement: true },
      { href: "/charges", label: "Charges & rentabilité", icon: Wallet, proprietaireSeulement: true },
      { href: "/personnel", label: "Personnel & Paie", icon: HandCoins, proprietaireSeulement: true },
    ],
  },
  {
    titre: "Administration",
    items: [
      { href: "/etablissements", label: "Établissements", icon: Store, proprietaireSeulement: true },
      { href: "/fournisseurs", label: "Fournisseurs", icon: Truck, proprietaireSeulement: true },
      { href: "/utilisateurs", label: "Utilisateurs", icon: Users, proprietaireSeulement: true },
      { href: "/audit", label: "Journal d’audit", icon: ShieldCheck, proprietaireSeulement: true },
      { href: "/sauvegardes", label: "Sauvegardes", icon: DatabaseBackup, proprietaireSeulement: true },
    ],
  },
];

const STORAGE_KEY = "gc_nav_groupes_replies";

export function AppNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { estProprietaire } = useAuth();

  const groupes = GROUPES.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.proprietaireSeulement || estProprietaire),
  })).filter((g) => g.items.length > 0);

  // Groupes repliés (titres présents = repliés). Par défaut tout est déplié.
  const [replies, setReplies] = useState<Set<string>>(new Set());

  // Restaure l'état replié après le montage (évite un décalage d'hydratation SSR).
  useEffect(() => {
    try {
      const brut = localStorage.getItem(STORAGE_KEY);
      if (brut) setReplies(new Set(JSON.parse(brut) as string[]));
    } catch {
      /* stockage indisponible : on garde tout déplié */
    }
  }, []);

  // Le groupe contenant la page active est toujours déplié.
  const groupeActif = groupes.find((g) => g.items.some((i) => pathname.startsWith(i.href)));
  useEffect(() => {
    if (groupeActif && replies.has(groupeActif.titre)) {
      setReplies((prev) => {
        const suivant = new Set(prev);
        suivant.delete(groupeActif.titre);
        persister(suivant);
        return suivant;
      });
    }
  }, [groupeActif, replies]);

  function persister(set: Set<string>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      /* stockage indisponible : sans effet */
    }
  }

  function basculer(titre: string) {
    setReplies((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(titre)) suivant.delete(titre);
      else suivant.add(titre);
      persister(suivant);
      return suivant;
    });
  }

  return (
    <>
      {/* Voile sombre derrière le tiroir sur mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200",
          "md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wine className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">Gestion Cave</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
            title="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {groupes.map((groupe) => {
            const replie = replies.has(groupe.titre);
            return (
              <div key={groupe.titre} className="pb-1">
                <button
                  onClick={() => basculer(groupe.titre)}
                  aria-expanded={!replie}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {groupe.titre}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      replie && "-rotate-90"
                    )}
                  />
                </button>
                {!replie && (
                  <div className="mt-1 space-y-1">
                    {groupe.items.map((item) => {
                      const actif = pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            actif
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
