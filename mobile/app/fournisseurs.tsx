import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { creerFournisseur, listerFournisseurs, modifierFournisseur, supprimerFournisseur } from "@/api/endpoints";
import type { Fournisseur, FournisseurInput } from "@/types";
import { colors, fontSize, formatMontant, formatNombre, radius, spacing } from "@/theme";

export default function FournisseursScreen() {
  const { estProprietaire } = useAuth();
  const [liste, setListe] = useState<Fournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Fournisseur | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      setListe(await listerFournisseurs());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setChargement(false);
    }
  }, []);

  React.useEffect(() => {
    charger();
  }, [charger]);

  function confirmerSuppression(f: Fournisseur) {
    Alert.alert("Supprimer le fournisseur", `Supprimer « ${f.nom} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await supprimerFournisseur(f.id);
            charger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Suppression impossible.");
          }
        },
      },
    ]);
  }

  if (!estProprietaire) return <Redirect href="/(tabs)" />;
  if (chargement && liste.length === 0) return <LoadingView />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <Button
        title="+ Nouveau fournisseur"
        onPress={() => {
          setEdition(null);
          setFormOuvert(true);
        }}
        style={{ marginBottom: spacing.md }}
      />
      <ErrorBanner message={erreur} />

      {liste.length === 0 ? (
        <EmptyView label="Aucun fournisseur." />
      ) : (
        liste.map((f) => (
          <Card key={f.id}>
            <View style={styles.head}>
              <Text style={styles.nom}>{f.nom}</Text>
              {!f.actif && <Badge text="Inactif" tone="neutral" />}
            </View>
            {f.contact ? <Row label="Contact" value={f.contact} /> : null}
            {f.telephone ? <Row label="Téléphone" value={f.telephone} /> : null}
            {f.adresse ? <Row label="Adresse" value={f.adresse} /> : null}
            <Row label="Nombre d'achats" value={formatNombre(f.nombreAchats)} />
            {f.montantTotalAchats != null ? (
              <Row label="Total achats" value={formatMontant(f.montantTotalAchats)} valueColor={colors.primary} />
            ) : null}
            <View style={styles.actions}>
              <Pressable
                style={styles.action}
                onPress={() => {
                  setEdition(f);
                  setFormOuvert(true);
                }}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
              </Pressable>
              {f.actif && (
                <Pressable style={styles.action} onPress={() => confirmerSuppression(f)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))
      )}

      <FournisseurForm
        visible={formOuvert}
        fournisseur={edition}
        onClose={() => setFormOuvert(false)}
        onSaved={() => {
          setFormOuvert(false);
          charger();
        }}
      />
    </Screen>
  );
}

function FournisseurForm({
  visible,
  fournisseur,
  onClose,
  onSaved,
}: {
  visible: boolean;
  fournisseur: Fournisseur | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [contact, setContact] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setErreur("");
    setNom(fournisseur?.nom ?? "");
    setTelephone(fournisseur?.telephone ?? "");
    setContact(fournisseur?.contact ?? "");
    setAdresse(fournisseur?.adresse ?? "");
    setNotes(fournisseur?.notes ?? "");
  }, [visible, fournisseur]);

  async function soumettre() {
    setErreur("");
    if (!nom.trim()) {
      setErreur("Le nom est requis.");
      return;
    }
    const input: FournisseurInput = {
      nom: nom.trim(),
      telephone: telephone.trim() || undefined,
      contact: contact.trim() || undefined,
      adresse: adresse.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    setEnvoi(true);
    try {
      if (fournisseur) await modifierFournisseur(fournisseur.id, input);
      else await creerFournisseur(input);
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
            <Text style={styles.modalTitle}>{fournisseur ? "Modifier" : "Nouveau fournisseur"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Nom" value={nom} onChangeText={setNom} />
            <Field label="Contact (optionnel)" value={contact} onChangeText={setContact} />
            <Field label="Téléphone (optionnel)" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" />
            <Field label="Adresse (optionnel)" value={adresse} onChangeText={setAdresse} />
            <Field label="Notes (optionnel)" value={notes} onChangeText={setNotes} multiline />
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
