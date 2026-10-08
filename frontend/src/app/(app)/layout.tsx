"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Store, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EtablissementProvider } from "@/lib/etablissement-context";
import { EtablissementSelecteur } from "@/components/etablissement-selecteur";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { utilisateur, chargement, logout, estProprietaire } = useAuth();
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    if (!chargement && !utilisateur) router.replace("/login");
  }, [utilisateur, chargement, router]);

  if (chargement || !utilisateur) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <EtablissementProvider>
      <div className="flex min-h-screen bg-secondary">
        <AppNav open={menuOuvert} onClose={() => setMenuOuvert(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-card">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
              <button
                onClick={() => setMenuOuvert(true)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
                title="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex flex-1 items-center justify-end gap-3">
                <EtablissementSelecteur />

                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium">{utilisateur.nom}</div>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    {estProprietaire ? (
                      <>
                        <ShieldCheck className="h-3 w-3" /> Propriétaire
                      </>
                    ) : (
                      <>
                        <Store className="h-3 w-3" /> Gérant
                      </>
                    )}
                  </div>
                </div>

                <Button variant="outline" size="icon" onClick={logout} title="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </EtablissementProvider>
  );
}
