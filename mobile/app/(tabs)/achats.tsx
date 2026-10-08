import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import {
  creerCommande,
  listerBoissons,
  listerCommandes,
  listerFournisseurs,
  supprimerCommande,
} from "@/api/endpoints";
import type { Boisson, CommandeFournisseur, Fournisseur } from "@/types";
import { libellesConditionnement } from "@/types";
import { colors, dateDuJour, fontSize, formatMontant, formatNombre, radius, spacing } from "@/theme";

export default function AchatsScreen() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const c = await listerCommandes(etablissementActifId);
      setCommandes(c);
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

  function confirmerSuppression(c: CommandeFournisseur) {
    Alert.alert("Supprimer l'achat", `Supprimer l'achat de ${c.designation} ? Le stock sera ajusté.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await supprimerCommande(c.id);
            charger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Suppression impossible.");
          }
        },
      },
    ]);
  }

  if (chargement && commandes.length === 0) return <LoadingView />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      <Button title="+ Nouvel achat" onPress={() => setFormOuvert(true)} style={{ marginBottom: spacing.md }} />
      <ErrorBanner message={erreur} />

      {commandes.length === 0 ? (
        <EmptyView label="Aucun achat enregistré." />
      ) : (
        commandes.map((c) => {
          const lib = libellesConditionnement(c.typeConditionnement);
          return (
            <Card key={c.id}>
              <View style={styles.cardHead}>
                <Text style={styles.nom}>{c.designation}</Text>
                <Badge text={c.etablissementNom} tone="primary" />
              </View>
              <Row label="Date" value={c.date.split("-").reverse().join("/")} />
              <Row label={`Nombre de ${lib.pluriel}`} value={formatNombre(c.nombreCasiers)} />
              <Row label="Bouteilles ajoutées" value={formatNombre(c.bouteillesAjoutees)} />
              {c.fournisseur ? <Row label="Fournisseur" value={c.fournisseur} /> : null}
              {estProprietaire && c.montantTotal != null ? (
                <Row label="Montant total" value={formatMontant(c.montantTotal)} valueColor={colors.primary} />
              ) : null}
              <Pressable style={styles.deleteRow} onPress={() => confirmerSuppression(c)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>Supprimer</Text>
              </Pressable>
            </Card>
          );
        })
      )}

      <AchatForm
        visible={formOuvert}
        onClose={() => setFormOuvert(false)}
        onCreated={() => {
          setFormOuvert(false);
          charger();
        }}
        estProprietaire={estProprietaire}
        etablissementActifId={etablissementActifId}
        etablissements={etablissements}
      />
    </Screen>
  );
}

function AchatForm({
  visible,
  onClose,
  onCreated,
  estProprietaire,
  etablissementActifId,
  etablissements,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  estProprietaire: boolean;
  etablissementActifId: number | null;
  etablissements: { id: number; nom: string }[];
}) {
  const [boissons, setBoissons] = useState<Boisson[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [boissonId, setBoissonId] = useState<number | null>(null);
  const [etabId, setEtabId] = useState<number | null>(etablissementActifId);
  const [nombre, setNombre] = useState("");
  const [fournisseurId, setFournisseurId] = useState<number | null>(null);
  const [prix, setPrix] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setEtabId(etablissementActifId ?? etablissements[0]?.id ?? null);
    listerBoissons().then(setBoissons).catch(() => {});
    if (estProprietaire) listerFournisseurs().then((f) => setFournisseurs(f.filter((x) => x.actif))).catch(() => {});
  }, [visible, etablissementActifId, estProprietaire, etablissements]);

  const boisson = useMemo(() => boissons.find((b) => b.id === boissonId), [boissons, boissonId]);
  const lib = libellesConditionnement(boisson?.typeConditionnement);
  const apercu =
    boisson && nombre
      ? (parseInt(nombre, 10) || 0) * boisson.bouteillesParConditionnement
      : 0;

  async function soumettre() {
    setErreur("");
    if (!boissonId || !etabId || !nombre) {
      setErreur("Boisson, établissement et quantité sont requis.");
      return;
    }
    setEnvoi(true);
    try {
      await creerCommande({
        boissonId,
        etablissementId: etabId,
        date: dateDuJour(),
        nombreCasiers: parseInt(nombre, 10) || 0,
        fournisseurId: fournisseurId ?? undefined,
        prixAchatCasier: estProprietaire && prix ? parseFloat(prix) : undefined,
      });
      // réinitialise
      setBoissonId(null);
      setNombre("");
      setFournisseurId(null);
      setPrix("");
      onCreated();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Nouvel achat</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Select
              label="Boisson"
              value={boissonId}
              onChange={setBoissonId}
              options={boissons.map((b) => ({ value: b.id, label: b.designation }))}
            />
            <Select
              label="Établissement"
              value={etabId}
              onChange={setEtabId}
              options={etablissements.map((e) => ({ value: e.id, label: e.nom }))}
            />
            <Field
              label={`Nombre de ${lib.pluriel}`}
              value={nombre}
              onChangeText={setNombre}
              keyboardType="number-pad"
              placeholder="0"
            />
            {apercu > 0 && (
              <Text style={styles.apercu}>
                ≈ {formatNombre(apercu)} bouteilles ajoutées au stock
              </Text>
            )}
            {estProprietaire && (
              <>
                <Select
                  label="Fournisseur (optionnel)"
                  value={fournisseurId}
                  onChange={setFournisseurId}
                  placeholder="Aucun / saisie libre non gérée ici"
                  options={fournisseurs.map((f) => ({ value: f.id, label: f.nom }))}
                />
                <Field
                  label={`Prix d'achat / ${lib.singulier} (optionnel)`}
                  value={prix}
                  onChangeText={setPrix}
                  keyboardType="decimal-pad"
                  placeholder="Prix catalogue par défaut"
                />
              </>
            )}
            <Button title="Enregistrer l'achat" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  nom: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1, paddingRight: spacing.sm },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: "600" },
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
  apercu: { color: colors.primary, fontSize: fontSize.sm, marginBottom: spacing.md, marginTop: -spacing.xs },
});
