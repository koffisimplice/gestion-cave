"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wine, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { HttpError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const { login, utilisateur, chargement } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!chargement && utilisateur) router.replace("/tableau-de-bord");
  }, [utilisateur, chargement, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await login(email, motDePasse);
      router.replace("/tableau-de-bord");
    } catch (err) {
      if (err instanceof HttpError) {
        setErreur(err.message);
      } else {
        setErreur("Impossible de contacter le serveur. Vérifiez votre connexion.");
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wine className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Gestion Cave</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous pour gérer votre maquis
          </p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Connexion</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email ou téléphone</Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="vous@exemple.com ou 0700000001"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="motDePasse"
                    type={voirMotDePasse ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                    title={voirMotDePasse ? "Masquer" : "Afficher"}
                  >
                    {voirMotDePasse ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {erreur && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {erreur}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={envoi}>
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                {envoi ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Compte de démonstration : 0700000001 (ou proprietaire@gestioncave.local) / Proprio@2026
        </p>
      </div>
    </div>
  );
}
