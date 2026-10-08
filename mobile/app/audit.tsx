import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Badge, Card, EmptyView, ErrorBanner, LoadingView } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { listerAudit } from "@/api/endpoints";
import type { JournalAudit } from "@/types";
import { colors, fontSize, spacing } from "@/theme";

const ACTIONS = [
  { value: "", label: "Toutes les actions" },
  { value: "CONNEXION", label: "Connexions" },
  { value: "CONNEXION_ECHOUEE", label: "Connexions échouées" },
  { value: "UTILISATEUR_CREE", label: "Utilisateur créé" },
  { value: "SALAIRE_PAYE", label: "Salaire payé" },
  { value: "FOURNISSEUR_CREE", label: "Fournisseur créé" },
];

function tonePourAction(action: string): "neutral" | "success" | "danger" | "warning" | "primary" {
  if (action.includes("ECHOUEE") || action.includes("BLOQUEE") || action.includes("SUPPRIME")) return "danger";
  if (action.includes("CREE") || action.includes("PAYE")) return "success";
  if (action.includes("CONNEXION")) return "primary";
  return "neutral";
}

export default function AuditScreen() {
  const { estProprietaire } = useAuth();
  const [action, setAction] = useState("");
  const [lignes, setLignes] = useState<JournalAudit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setErreur("");
    try {
      setLignes(await listerAudit(action || undefined, 200));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [action]);

  React.useEffect(() => {
    setChargement(true);
    charger();
  }, [charger]);

  if (!estProprietaire) return <Redirect href="/(tabs)" />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <Select label="Filtrer" value={action} onChange={setAction} options={ACTIONS} />
      <ErrorBanner message={erreur} />

      {chargement && lignes.length === 0 ? (
        <LoadingView />
      ) : lignes.length === 0 ? (
        <EmptyView label="Aucune entrée." />
      ) : (
        lignes.map((l) => (
          <Card key={l.id}>
            <View style={styles.head}>
              <Badge text={l.action} tone={tonePourAction(l.action)} />
              <Text style={styles.date}>{new Date(l.dateHeure).toLocaleString("fr-FR")}</Text>
            </View>
            <Text style={styles.acteur}>{l.acteur}</Text>
            {l.cible ? <Text style={styles.detail}>Cible : {l.cible}</Text> : null}
            {l.details ? <Text style={styles.detail}>{l.details}</Text> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  date: { color: colors.textFaint, fontSize: fontSize.xs },
  acteur: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  detail: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
});
