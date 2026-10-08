import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, LoadingView, SectionTitle } from "@/components/ui";
import { useEtablissement } from "@/context/etablissement";
import { cloturerPoint, enregistrerVente, getPointDuJour, majLigne } from "@/api/endpoints";
import type { LigneRegistre, PointJournalier } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, formatNombre, radius, spacing } from "@/theme";

export default function RegistreScreen() {
  const { etablissementActifId, etablissements } = useEtablissement();
  const [point, setPoint] = useState<PointJournalier | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const date = dateDuJour();

  const charger = useCallback(async () => {
    if (!etablissementActifId) {
      setPoint(null);
      setChargement(false);
      return;
    }
    setErreur("");
    try {
      const p = await getPointDuJour(etablissementActifId, date);
      setPoint(p);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [etablissementActifId, date]);

  useFocusEffect(
    useCallback(() => {
      setChargement(true);
      charger();
    }, [charger])
  );

  const sauvegarder = useCallback(
    async (ligne: LigneRegistre, commande: number, vendu: number | null, perte: number) => {
      try {
        const p = await majLigne(ligne.id, commande, vendu, perte, ligne.motifPerte);
        setPoint(p);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
        charger();
      }
    },
    [charger]
  );

  const vendrePlus = useCallback(async (ligne: LigneRegistre) => {
    try {
      const p = await enregistrerVente(ligne.id, 1);
      setPoint(p);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Vente impossible.");
    }
  }, []);

  function confirmerCloture() {
    if (!etablissementActifId) return;
    Alert.alert("Arrêter le point du jour", "Le registre sera verrouillé pour aujourd'hui. Continuer ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Arrêter",
        style: "destructive",
        onPress: async () => {
          try {
            const p = await cloturerPoint(etablissementActifId, date);
            setPoint(p);
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Clôture impossible.");
          }
        },
      },
    ]);
  }

  if (chargement && !point) return <LoadingView />;

  const consolide = !etablissementActifId;
  const cloture = point?.statut === "CLOTURE";

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      <ErrorBanner message={erreur} />

      {consolide ? (
        <EmptyView
          label={
            etablissements.length === 0
              ? "Aucun établissement disponible."
              : "Choisissez un établissement précis ci-dessus pour saisir le registre du jour."
          }
        />
      ) : !point ? (
        <EmptyView label="Aucune donnée pour aujourd'hui." />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.dateText}>Registre du {date.split("-").reverse().join("/")}</Text>
            <Badge text={cloture ? "Clôturé" : "Ouvert"} tone={cloture ? "neutral" : "success"} />
          </View>

          <View style={styles.recap}>
            <RecapCell label="Vendu" value={formatNombre(point.totalVendu)} />
            <RecapCell label="Perte" value={formatNombre(point.totalPerdu)} />
            <RecapCell label="CA" value={formatMontant(point.totalPrixVenteTotal)} tone="primary" />
          </View>

          {point.lignes.length === 0 ? (
            <EmptyView label="Aucune boisson active." />
          ) : (
            point.lignes.map((l) => (
              <LigneCard
                key={l.id}
                ligne={l}
                verrouille={cloture}
                onSave={sauvegarder}
                onVendrePlus={vendrePlus}
              />
            ))
          )}

          {!cloture && (
            <Button
              title="Arrêter le point du jour"
              variant="danger"
              onPress={confirmerCloture}
              style={{ marginTop: spacing.md }}
            />
          )}
        </>
      )}
    </Screen>
  );
}

function RecapCell({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <View style={styles.recapCell}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={[styles.recapValue, tone === "primary" && { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function LigneCard({
  ligne,
  verrouille,
  onSave,
  onVendrePlus,
}: {
  ligne: LigneRegistre;
  verrouille: boolean;
  onSave: (l: LigneRegistre, commande: number, vendu: number | null, perte: number) => void;
  onVendrePlus: (l: LigneRegistre) => void;
}) {
  const [commande, setCommande] = useState(String(ligne.commandeDuJour ?? 0));
  const [vendu, setVendu] = useState(ligne.stockVendu == null ? "" : String(ligne.stockVendu));
  const [perte, setPerte] = useState(String(ligne.stockPerdu ?? 0));

  // Resynchronise les champs si la ligne change (après une vente +1, une sauvegarde…).
  React.useEffect(() => {
    setCommande(String(ligne.commandeDuJour ?? 0));
    setVendu(ligne.stockVendu == null ? "" : String(ligne.stockVendu));
    setPerte(String(ligne.stockPerdu ?? 0));
  }, [ligne.commandeDuJour, ligne.stockVendu, ligne.stockPerdu]);

  function flush() {
    if (verrouille) return;
    const c = parseInt(commande || "0", 10) || 0;
    const v = vendu.trim() === "" ? null : parseInt(vendu, 10) || 0;
    const p = parseInt(perte || "0", 10) || 0;
    onSave(ligne, c, v, p);
  }

  return (
    <Card style={ligne.rupture ? styles.cardRupture : ligne.alerteStockBas ? styles.cardAlerte : undefined}>
      <View style={styles.ligneHead}>
        <Text style={styles.ligneNom}>{ligne.designation}</Text>
        {ligne.rupture ? (
          <Badge text="Rupture" tone="danger" />
        ) : ligne.alerteStockBas ? (
          <Badge text="Stock bas" tone="warning" />
        ) : null}
      </View>

      <View style={styles.stockRow}>
        <Text style={styles.stockInfo}>Ancien : {formatNombre(ligne.ancienStock)}</Text>
        <Text style={styles.stockInfo}>Nouveau : {formatNombre(ligne.nouveauStock)}</Text>
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputBox}>
          <Text style={styles.miniLabel}>Commande</Text>
          <MiniInput value={commande} onChangeText={setCommande} onBlur={flush} editable={!verrouille} />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.miniLabel}>Perte</Text>
          <MiniInput
            value={perte}
            onChangeText={setPerte}
            onBlur={flush}
            editable={!verrouille}
            warn={(parseInt(perte || "0", 10) || 0) > 0}
          />
        </View>
      </View>

      <View style={styles.venteRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniLabel}>Vendu</Text>
          <MiniInput value={vendu} onChangeText={setVendu} onBlur={flush} editable={!verrouille} placeholder="0" />
        </View>
        {!verrouille && (
          <Pressable style={styles.plusBtn} onPress={() => onVendrePlus(ligne)}>
            <Ionicons name="add" size={22} color={colors.white} />
            <Text style={styles.plusText}>1</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerItem}>
          Restant : <Text style={styles.footerStrong}>{formatNombre(ligne.stockRestant)}</Text>
        </Text>
        <Text style={styles.footerItem}>
          PVT : <Text style={[styles.footerStrong, { color: colors.primary }]}>{formatMontant(ligne.prixVenteTotal)}</Text>
        </Text>
      </View>
    </Card>
  );
}

function MiniInput({
  value,
  onChangeText,
  onBlur,
  editable,
  placeholder,
  warn,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onBlur: () => void;
  editable: boolean;
  placeholder?: string;
  warn?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      editable={editable}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={[
        styles.miniInput,
        !editable && { opacity: 0.5 },
        warn && { borderColor: colors.warning },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  dateText: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  recap: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  recapCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  recapLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  recapValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", marginTop: 2 },
  cardRupture: { borderColor: colors.danger },
  cardAlerte: { borderColor: colors.warning },
  ligneHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  ligneNom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1, paddingRight: spacing.sm },
  stockRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  stockInfo: { color: colors.textMuted, fontSize: fontSize.sm },
  inputsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  inputBox: { flex: 1 },
  venteRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md, marginBottom: spacing.md },
  miniLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.xs },
  miniInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    height: 48,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    textAlign: "center",
  },
  plusBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  plusText: { color: colors.white, fontWeight: "800", fontSize: fontSize.md },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  footerItem: { color: colors.textMuted, fontSize: fontSize.sm },
  footerStrong: { color: colors.text, fontWeight: "700" },
});
