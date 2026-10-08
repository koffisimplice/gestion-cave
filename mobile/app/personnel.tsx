import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, StatCard } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { annulerPaiement, creerEmploye, getEtatPaie, payerSalaire } from "@/api/endpoints";
import type { EmployeInput, LignePaie, PaiementInput } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, radius, spacing } from "@/theme";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function PersonnelScreen() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [paie, setPaie] = useState<LignePaie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [paiement, setPaiement] = useState<LignePaie | null>(null);
  const [employeOuvert, setEmployeOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      setPaie(await getEtatPaie(annee, mois, etablissementActifId));
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

  const prevus = paie.reduce((s, l) => s + l.salaireMensuel, 0);
  const payes = paie.filter((l) => l.paye).reduce((s, l) => s + (l.montantPaye ?? 0), 0);
  const reste = prevus - payes;

  function confirmerAnnulation(l: LignePaie) {
    if (!l.paiementId) return;
    Alert.alert("Annuler le paiement", `Annuler le salaire payé à ${l.nom} ?`, [
      { text: "Retour", style: "cancel" },
      {
        text: "Annuler le paiement",
        style: "destructive",
        onPress: async () => {
          try {
            await annulerPaiement(l.paiementId!);
            charger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Annulation impossible.");
          }
        },
      },
    ]);
  }

  if (!estProprietaire) return <Redirect href="/(tabs)" />;
  if (chargement && paie.length === 0) return <LoadingView />;

  const annees = [now.getFullYear(), now.getFullYear() - 1];

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

      <View style={styles.grid}>
        <StatCard label="Salaires prévus" value={formatMontant(prevus)} />
        <StatCard label="Payé" value={formatMontant(payes)} tone="success" />
        <StatCard label="Reste à payer" value={formatMontant(reste)} tone={reste > 0 ? "warning" : "neutral"} />
      </View>

      <Button title="+ Nouvel employé" variant="ghost" onPress={() => setEmployeOuvert(true)} style={{ marginBottom: spacing.md }} />
      <ErrorBanner message={erreur} />

      {paie.length === 0 ? (
        <EmptyView label="Aucun employé actif." />
      ) : (
        paie.map((l) => (
          <Card key={l.employeId}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{l.nom}</Text>
                <Text style={styles.sub}>
                  {l.poste ? `${l.poste} · ` : ""}
                  {l.etablissementNom}
                </Text>
              </View>
              {l.paye ? <Badge text="Payé" tone="success" /> : <Badge text="À payer" tone="warning" />}
            </View>
            <View style={styles.salaireRow}>
              <Text style={styles.salaireLabel}>Salaire mensuel</Text>
              <Text style={styles.salaire}>{formatMontant(l.salaireMensuel)}</Text>
            </View>
            {l.paye ? (
              <Pressable style={styles.annuler} onPress={() => confirmerAnnulation(l)}>
                <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.annulerText}>
                  Payé {formatMontant(l.montantPaye)} · Annuler
                </Text>
              </Pressable>
            ) : (
              <Button title="Marquer payé" onPress={() => setPaiement(l)} style={{ marginTop: spacing.md }} />
            )}
          </Card>
        ))
      )}

      <PaiementForm
        ligne={paiement}
        annee={annee}
        mois={mois}
        onClose={() => setPaiement(null)}
        onPaid={() => {
          setPaiement(null);
          charger();
        }}
      />

      <EmployeForm
        visible={employeOuvert}
        etablissements={etablissements}
        etablissementActifId={etablissementActifId}
        onClose={() => setEmployeOuvert(false)}
        onSaved={() => {
          setEmployeOuvert(false);
          charger();
        }}
      />
    </Screen>
  );
}

function PaiementForm({
  ligne,
  annee,
  mois,
  onClose,
  onPaid,
}: {
  ligne: LignePaie | null;
  annee: number;
  mois: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [montant, setMontant] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (ligne) {
      setMontant(String(ligne.salaireMensuel));
      setErreur("");
    }
  }, [ligne]);

  async function soumettre() {
    if (!ligne) return;
    setErreur("");
    const input: PaiementInput = {
      employeId: ligne.employeId,
      annee,
      mois,
      montant: parseFloat(montant) || 0,
      datePaiement: dateDuJour(),
    };
    setEnvoi(true);
    try {
      await payerSalaire(input);
      onPaid();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Paiement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={!!ligne} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Payer {ligne?.nom}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ErrorBanner message={erreur} />
          <Field label="Montant versé" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" />
          <Button title="Confirmer le paiement" onPress={soumettre} loading={envoi} />
        </View>
      </View>
    </Modal>
  );
}

function EmployeForm({
  visible,
  etablissements,
  etablissementActifId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  etablissements: { id: number; nom: string }[];
  etablissementActifId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [poste, setPoste] = useState("");
  const [salaire, setSalaire] = useState("");
  const [telephone, setTelephone] = useState("");
  const [etabId, setEtabId] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setNom("");
    setPoste("");
    setSalaire("");
    setTelephone("");
    setEtabId(etablissementActifId ?? etablissements[0]?.id ?? null);
    setErreur("");
  }, [visible, etablissementActifId, etablissements]);

  async function soumettre() {
    setErreur("");
    if (!nom.trim() || !salaire || !etabId) {
      setErreur("Nom, salaire et établissement sont requis.");
      return;
    }
    const input: EmployeInput = {
      etablissementId: etabId,
      nom: nom.trim(),
      poste: poste.trim() || undefined,
      salaireMensuel: parseFloat(salaire) || 0,
      telephone: telephone.trim() || undefined,
    };
    setEnvoi(true);
    try {
      await creerEmploye(input);
      onSaved();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Nouvel employé</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Nom" value={nom} onChangeText={setNom} />
            <Field label="Poste (optionnel)" value={poste} onChangeText={setPoste} />
            <Field label="Salaire mensuel" value={salaire} onChangeText={setSalaire} keyboardType="decimal-pad" />
            <Field label="Téléphone (optionnel)" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
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
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  salaireRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  salaireLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  salaire: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  annuler: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  annulerText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: "600" },
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
