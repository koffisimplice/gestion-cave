import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { creerEtablissement, desactiverEtablissement, modifierEtablissement } from "@/api/endpoints";
import type { Etablissement, EtablissementInput } from "@/types";
import { colors, fontSize, radius, spacing } from "@/theme";

export default function EtablissementsScreen() {
  const { estProprietaire } = useAuth();
  const { etablissements, chargement, rafraichir } = useEtablissement();
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Etablissement | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const recharger = useCallback(async () => {
    setRefreshing(true);
    try {
      await rafraichir();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setRefreshing(false);
    }
  }, [rafraichir]);

  function confirmerDesactivation(e: Etablissement) {
    Alert.alert("Désactiver l'établissement", `Désactiver « ${e.nom} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Désactiver",
        style: "destructive",
        onPress: async () => {
          try {
            await desactiverEtablissement(e.id);
            recharger();
          } catch (err) {
            setErreur(err instanceof Error ? err.message : "Opération impossible.");
          }
        },
      },
    ]);
  }

  if (!estProprietaire) return <Redirect href="/(tabs)" />;
  if (chargement && etablissements.length === 0) return <LoadingView />;

  return (
    <Screen onRefresh={recharger} refreshing={refreshing}>
      <Button
        title="+ Nouvel établissement"
        onPress={() => {
          setEdition(null);
          setFormOuvert(true);
        }}
        style={{ marginBottom: spacing.md }}
      />
      <ErrorBanner message={erreur} />

      {etablissements.length === 0 ? (
        <EmptyView label="Aucun établissement." />
      ) : (
        etablissements.map((e) => (
          <Card key={e.id}>
            <View style={styles.head}>
              <Text style={styles.nom}>{e.nom}</Text>
              {!e.actif && <Badge text="Inactif" tone="neutral" />}
            </View>
            {e.responsable ? <Row label="Responsable" value={e.responsable} /> : null}
            {e.adresse ? <Row label="Adresse" value={e.adresse} /> : null}
            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => {
                  setEdition(e);
                  setFormOuvert(true);
                }}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
              </Pressable>
              {e.actif && (
                <Pressable style={styles.action} onPress={() => confirmerDesactivation(e)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Désactiver</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))
      )}

      <EtablissementForm
        visible={formOuvert}
        etablissement={edition}
        onClose={() => setFormOuvert(false)}
        onSaved={() => {
          setFormOuvert(false);
          recharger();
        }}
      />
    </Screen>
  );
}

function EtablissementForm({
  visible,
  etablissement,
  onClose,
  onSaved,
}: {
  visible: boolean;
  etablissement: Etablissement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [responsable, setResponsable] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setErreur("");
    setNom(etablissement?.nom ?? "");
    setAdresse(etablissement?.adresse ?? "");
    setResponsable(etablissement?.responsable ?? "");
  }, [visible, etablissement]);

  async function soumettre() {
    setErreur("");
    if (!nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    const input: EtablissementInput = {
      nom: nom.trim(),
      adresse: adresse.trim() || undefined,
      responsable: responsable.trim() || undefined,
    };
    setEnvoi(true);
    try {
      if (etablissement) await modifierEtablissement(etablissement.id, input);
      else await creerEtablissement(input);
      onSaved();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{etablissement ? "Modifier" : "Nouvel établissement"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Nom" value={nom} onChangeText={setNom} />
            <Field label="Responsable (optionnel)" value={responsable} onChangeText={setResponsable} />
            <Field label="Adresse (optionnel)" value={adresse} onChangeText={setAdresse} />
            <Button title="Enregistrer" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1, paddingRight: spacing.sm },
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
