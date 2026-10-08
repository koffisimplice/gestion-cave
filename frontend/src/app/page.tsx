"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { utilisateur, chargement } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return;
    router.replace(utilisateur ? "/tableau-de-bord" : "/login");
  }, [utilisateur, chargement, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Chargement…
    </div>
  );
}
