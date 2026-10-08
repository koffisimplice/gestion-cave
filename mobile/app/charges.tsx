import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row, SectionTitle, StatCard } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { creerCharge, getRentabilite, listerCharges, modifierCharge, supprimerCharge } from "@/api/endpoints";
import type { CategorieCharge, Charge, ChargeInput, Periodicite, Rentabilite } from "@/types";
import { colors, fontSize, formatMontant, radius, spacing } from "@/theme";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const CATEGORIES: CategorieCharge[] = ["VARIABLE", "FIXE", "OBLIGATOIRE"];
const PERIODICITES: Periodicite[] = ["PONCTUELLE", "HEBDOMADAIRE", "MENSUELLE", "TRIMESTRIELLE", "ANNUELLE"];

export default function ChargesScreen() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [rentabilite, setRentabilite] = useState<Rentabilite | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Charge | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const [r, c] = await Promise.all([
        getRentabilite(annee, mois, etablissementActifId),
        listerCharges(annee, mois, etablissementActifId),
      ]);
      setRentabilite(r);
      setCharges(c);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, [annee, mois, etablissementActifId]);

  React.useEffect(() => {
    setChargement(true);
    charger();
  }, [charger]);

  function confirmerSuppression(c: Charge) {
    Alert.alert("Supprimer la charge", `Supprimer « ${c.libelle} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await supprimerCharge(c.id);
            charger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Suppression impossible.");
          }
        },
      },
    ]);
  }

  if (!estProprietaire) return <Redirect href="/(tabs)" />;
  if (chargement && !rentabilite) return <LoadingView />;

  const annees = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      <View style={styles.periodRow}>
        <View style={{ flex: 2 }}>
          <Select label="Mois" value={mois} onChange={setMois} options={MOIS.map((m, i) => ({ value: i + 1, label: m }))} />
        </View>
        <View style={{ flex: 1 }}>
          <Select label="Année" value={annee} onChange={setAnnee} options={annees.map((a) => ({ value: a, label: String(a) }))} />
        </View>
      </View>

      <ErrorBanner message={erreur} />

      {rentabilite && (
        <>
          <View
            style={[
              styles.banner,
              {
                backgroundColor: rentabilite.beneficiaire ? colors.successBg : colors.dangerBg,
                borderColor: rentabilite.beneficiaire ? colors.success : colors.danger,
              },
            ]}
          >
            <Text style={styles.bannerText}>
              {rentabilite.beneficiaire ? "Bénéficiaire ce mois-ci ✅" : "Déficitaire ce mois-ci ⚠️"}
            </Text>
            <Text style={styles.bannerSub}>Taux de marge : {(rentabilite.tauxMarge * 100).toFixed(1)} %</Text>
          </View>

          <View style={styles.grid}>
            <StatCard label="Chiffre d'affaires" value={formatMontant(rentabilite.chiffreAffaires)} tone="primary" />
            <StatCard label="Bénéfice brut" value={formatMontant(rentabilite.beneficeBrut)} />
          </View>
          <View style={styles.grid}>
            <StatCard label="Total charges" value={formatMontant(rentabilite.totalCharges)} tone="warning" />
            <StatCard
              label="Bénéfice net"
              value={formatMontant(rentabilite.beneficeNet)}
              tone={rentabilite.beneficiaire ? "success" : "danger"}
            />
          </View>
          {rentabilite.chiffreAffairesSeuil != null && (
            <Card>
              <Row label="Seuil de rentabilité (CA)" value={formatMontant(rentabilite.chiffreAffairesSeuil)} />
            </Card>
          )}
        </>
      )}

      <View style={styles.listHead}>
        <SectionTitle>Charges du mois</SectionTitle>
        <Button
          title="+ Ajouter"
          variant="ghost"
          onPress={() => {
            setEdition(null);
            setFormOuvert(true);
          }}
          style={{ minHeight: 40, paddingHorizontal: spacing.md }}
        />
      </View>

      {charges.length === 0 ? (
        <EmptyView label="Aucune charge ce mois-ci." />
      ) : (
        charges.map((c) => {
          const salaire = c.categorie === "SALAIRE";
          return (
            <Card key={c.id}>
              <View style={styles.chargeHead}>
                <Text style={styles.nom}>{c.libelle}</Text>
                <Text style={styles.montant}>{formatMontant(c.montant)}</Text>
              </View>
              <View style={styles.chargeMeta}>
                <Badge text={salaire ? "Salaire" : c.categorie} tone={salaire ? "primary" : "neutral"} />
                <Badge text={c.periodicite} tone="neutral" />
                <Text style={styles.etab}>{c.etablissementNom}</Text>
              </View>
              {salaire ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={13} color={colors.textFaint} />
                  <Text style={styles.lockText}>Gérée depuis Personnel & paie</Text>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.action}
                    onPress={() => {
                      setEdition(c);
                      setFormOuvert(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                  </Pressable>
                  <Pressable style={styles.action} onPress={() => confirmerSuppression(c)}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })
      )}

      <ChargeForm
        visible={formOuvert}
        charge={edition}
        annee={annee}
        mois={mois}
        etablissements={etablissements}
        etablissementActifId={etablissementActifId}
        onClose={() => setFormOuvert(false)}
        onSaved={() => {
          setFormOuvert(false);
          charger();
        }}
      />
    </Screen>
  );
}

function ChargeForm({
  visible,
  charge,
  annee,
  mois,
  etablissements,
  etablissementActifId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  charge: Charge | null;
  annee: number;
  mois: number;
  etablissements: { id: number; nom: string }[];
  etablissementActifId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState<CategorieCharge>("FIXE");
  const [periodicite, setPeriodicite] = useState<Periodicite>("MENSUELLE");
  const [etabId, setEtabId] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setErreur("");
    if (charge) {
      setLibelle(charge.libelle);
      setMontant(String(charge.montant));
      setCategorie(charge.categorie === "SALAIRE" ? "FIXE" : charge.categorie);
      setPeriodicite(charge.periodicite);
      setEtabId(charge.etablissementId);
    } else {
      setLibelle("");
      setMontant("");
      setCategorie("FIXE");
      setPeriodicite("MENSUELLE");
      setEtabId(etablissementActifId ?? etablissements[0]?.id ?? null);
    }
  }, [visible, charge, etablissementActifId, etablissements]);

  async function soumettre() {
    setErreur("");
    if (!libelle.trim() || !montant || !etabId) {
      setErreur("Libellé, montant et établissement sont requis.");
      return;
    }
    const input: ChargeInput = {
      etablissementId: etabId,
      categorie,
      libelle: libelle.trim(),
      montant: parseFloat(montant) || 0,
      periodicite,
      annee,
      mois,
    };
    setEnvoi(true);
    try {
      if (charge) await modifierCharge(charge.id, input);
      else await creerCharge(input);
      onSaved();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{charge ? "Modifier la charge" : "Nouvelle charge"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Libellé" value={libelle} onChangeText={setLibelle} placeholder="Ex. Loyer, Électricité…" />
            <Field label="Montant" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" />
            <Select label="Catégorie" value={categorie} onChange={setCategorie} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <Select label="Périodicité" value={periodicite} onChange={setPeriodicite} options={PERIODICITES.map((p) => ({ value: p, label: p }))} />
            <Select
              label="Établissement"
              value={etabId}
              onChange={setEtabId}
              options={etablissements.map((e) => ({ value: e.id, label: e.nom }))}
            />
            <Button title="Enregistrer" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: "row", gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  bannerSub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chargeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1, paddingRight: spacing.sm },
  montant: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
  chargeMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  etab: { color: colors.textMuted, fontSize: fontSize.xs },
  lock: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  lockText: { color: colors.textFaint, fontSize: fontSize.xs },
  actions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionText: { fontSize: fontSize.sm, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "90%",
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
});
