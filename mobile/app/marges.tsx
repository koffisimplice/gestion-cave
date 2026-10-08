import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Card, EmptyView, ErrorBanner, LoadingView, Row, SectionTitle, StatCard } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { analyserMarges } from "@/api/endpoints";
import type { AnalyseMarge } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, formatNombre, spacing } from "@/theme";

function debutMois() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function ilYAJours(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PERIODES = [
  { value: "jour", label: "Aujourd'hui" },
  { value: "semaine", label: "7 derniers jours" },
  { value: "mois", label: "Mois en cours" },
] as const;

export default function MargesScreen() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId } = useEtablissement();
  const [periode, setPeriode] = useState<string>("mois");
  const [data, setData] = useState<AnalyseMarge | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setErreur("");
    setChargement(true);
    const fin = dateDuJour();
    const debut = periode === "jour" ? fin : periode === "semaine" ? ilYAJours(6) : debutMois();
    try {
      setData(await analyserMarges(debut, fin, etablissementActifId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [periode, etablissementActifId]);

  React.useEffect(() => {
    charger();
  }, [charger]);

  if (!estProprietaire) return <Redirect href="/(tabs)" />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      <Select
        label="Période"
        value={periode}
        onChange={setPeriode}
        options={PERIODES.map((p) => ({ value: p.value, label: p.label }))}
      />
      <ErrorBanner message={erreur} />

      {chargement && !data ? (
        <LoadingView />
      ) : !data ? (
        <EmptyView label="Aucune donnée." />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Chiffre d'affaires" value={formatMontant(data.chiffreAffaires)} tone="primary" />
            <StatCard
              label="Bénéfice brut"
              value={formatMontant(data.beneficeBrut)}
              tone={data.beneficeBrut >= 0 ? "success" : "danger"}
            />
          </View>
          <View style={styles.grid}>
            <StatCard label="Qté vendue" value={formatNombre(data.totalQuantiteVendue)} />
            <StatCard label="Stock (valeur vente)" value={formatMontant(data.valorisationStockVente)} />
          </View>

          <SectionTitle>Détail par boisson</SectionTitle>
          {data.lignes.length === 0 ? (
            <EmptyView label="Aucune vente sur la période." />
          ) : (
            data.lignes.map((l) => (
              <Card key={l.boissonId}>
                <Text style={styles.nom}>{l.designation}</Text>
                <View style={{ marginTop: spacing.sm }}>
                  <Row label="Qté vendue" value={formatNombre(l.quantiteVendue)} />
                  <Row label="Prix revient / vente" value={`${formatMontant(l.prixRevientUnitaire)} / ${formatMontant(l.prixVenteUnitaire)}`} />
                  <Row label="Marge unitaire" value={formatMontant(l.margeUnitaire)} />
                  <Row
                    label="Bénéfice"
                    value={formatMontant(l.benefice)}
                    valueColor={l.benefice >= 0 ? colors.success : colors.danger}
                  />
                  <Row label="CA" value={formatMontant(l.chiffreAffaires)} valueColor={colors.primary} />
                </View>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
});
