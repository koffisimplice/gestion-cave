import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row } from "@/components/ui";
import { useEtablissement } from "@/context/etablissement";
import { getHistorique } from "@/api/endpoints";
import type { LigneHistorique } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, formatNombre, spacing } from "@/theme";

function ilYAJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function HistoriqueScreen() {
  const { etablissementActifId } = useEtablissement();
  const [debut, setDebut] = useState(ilYAJours(7));
  const [fin, setFin] = useState(dateDuJour());
  const [lignes, setLignes] = useState<LigneHistorique[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setErreur("");
    setChargement(true);
    try {
      setLignes(await getHistorique(debut, fin, etablissementActifId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [debut, fin, etablissementActifId]);

  React.useEffect(() => {
    charger();
  }, [charger]);

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      <Card>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Field label="Début" value={debut} onChangeText={setDebut} placeholder="AAAA-MM-JJ" autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fin" value={fin} onChangeText={setFin} placeholder="AAAA-MM-JJ" autoCapitalize="none" />
          </View>
        </View>
        <Button title="Filtrer" onPress={charger} loading={chargement} />
      </Card>

      <ErrorBanner message={erreur} />

      {chargement && lignes.length === 0 ? (
        <LoadingView />
      ) : lignes.length === 0 ? (
        <EmptyView label="Aucune ligne sur cette période." />
      ) : (
        lignes.map((l) => (
          <Card key={l.id}>
            <View style={styles.head}>
              <Text style={styles.nom}>{l.designation}</Text>
              <Badge text={l.statut === "CLOTURE" ? "Clôturé" : "Ouvert"} tone={l.statut === "CLOTURE" ? "neutral" : "success"} />
            </View>
            <Text style={styles.sub}>
              {l.date.split("-").reverse().join("/")} · {l.etablissementNom}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <Row label="Ancien → Nouveau" value={`${formatNombre(l.ancienStock)} → ${formatNombre(l.nouveauStock)}`} />
              <Row label="Vendu" value={formatNombre(l.stockVendu)} />
              <Row label="Restant" value={formatNombre(l.stockRestant)} />
              <Row label="CA" value={formatMontant(l.prixVenteTotal)} valueColor={colors.primary} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: spacing.md },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1, paddingRight: spacing.sm },
  sub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
});
