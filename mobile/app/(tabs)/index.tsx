import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Card, EmptyView, ErrorBanner, LoadingView, Row, SectionTitle, StatCard } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { getSynthese } from "@/api/endpoints";
import type { TableauBord } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, formatNombre, spacing } from "@/theme";

export default function TableauDeBordScreen() {
  const { utilisateur, estProprietaire } = useAuth();
  const { etablissementActifId } = useEtablissement();
  const [data, setData] = useState<TableauBord | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const d = await getSynthese(etablissementActifId, dateDuJour());
      setData(d);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId]);

  useFocusEffect(
    useCallback(() => {
      setChargement(true);
      charger();
    }, [charger])
  );

  if (chargement && !data) return <LoadingView />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <Text style={styles.bonjour}>Bonjour, {utilisateur?.nom} 👋</Text>
      <EtablissementSelector />
      <ErrorBanner message={erreur} />

      {!data ? (
        <EmptyView label="Aucune donnée." />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Ventes du jour" value={formatMontant(data.ventesDuJour.chiffreAffaires)} tone="primary" />
            <StatCard label="Qté vendue (jour)" value={formatNombre(data.ventesDuJour.quantite)} />
          </View>
          <View style={styles.grid}>
            <StatCard label="Ventes du mois" value={formatMontant(data.ventesDuMois.chiffreAffaires)} tone="primary" />
            <StatCard label="Qté vendue (mois)" value={formatNombre(data.ventesDuMois.quantite)} />
          </View>

          <View style={styles.grid}>
            <StatCard label="Stock total" value={formatNombre(data.stockTotal)} />
            <StatCard
              label="Alertes stock bas"
              value={formatNombre(data.nbStockBas)}
              tone={data.nbStockBas > 0 ? "warning" : "neutral"}
            />
            <StatCard
              label="Ruptures"
              value={formatNombre(data.nbRuptures)}
              tone={data.nbRuptures > 0 ? "danger" : "neutral"}
            />
          </View>

          {estProprietaire && data.beneficeNetMois != null && (
            <Card>
              <SectionTitle>Finances du mois</SectionTitle>
              <Row label="Bénéfice brut" value={formatMontant(data.beneficeBrutMois)} />
              <Row label="Charges" value={formatMontant(data.totalChargesMois)} />
              <Row
                label="Bénéfice net"
                value={formatMontant(data.beneficeNetMois)}
                valueColor={data.beneficiaire ? colors.success : colors.danger}
              />
              <View style={{ marginTop: spacing.sm }}>
                <Badge
                  text={data.beneficiaire ? "Bénéficiaire" : "Déficitaire"}
                  tone={data.beneficiaire ? "success" : "danger"}
                />
              </View>
            </Card>
          )}

          <Card>
            <SectionTitle>Meilleures ventes</SectionTitle>
            {data.meilleuresVentes.length === 0 ? (
              <Text style={styles.muted}>Aucune vente enregistrée.</Text>
            ) : (
              data.meilleuresVentes.map((b) => (
                <Row
                  key={b.boissonId}
                  label={`${b.designation} (${formatNombre(b.quantiteVendue)})`}
                  value={formatMontant(b.chiffreAffaires)}
                />
              ))
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bonjour: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800", marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
});
