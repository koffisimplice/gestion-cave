import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EtablissementSelector } from "@/components/EtablissementSelector";
import { Screen } from "@/components/Screen";
import { Badge, Button, Card, EmptyView, ErrorBanner, Field, LoadingView, Row } from "@/components/ui";
import { Select } from "@/components/Select";
import { useAuth } from "@/context/auth";
import { useEtablissement } from "@/context/etablissement";
import { creerBoisson, desactiverBoisson, listerBoissons, modifierBoisson } from "@/api/endpoints";
import { CONDITIONNEMENTS, libellesConditionnement } from "@/types";
import type { Boisson, BoissonInput, TypeConditionnement } from "@/types";
import { colors, fontSize, formatMontant, formatNombre, radius, spacing } from "@/theme";

export default function BoissonsScreen() {
  const { estProprietaire } = useAuth();
  const { etablissementActifId, etablissements } = useEtablissement();
  const [boissons, setBoissons] = useState<Boisson[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState<Boisson | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);

  const charger = useCallback(async () => {
    setErreur("");
    try {
      setBoissons(await listerBoissons(etablissementActifId));
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

  function ouvrirCreation() {
    setEdition(null);
    setFormOuvert(true);
  }
  function ouvrirEdition(b: Boisson) {
    setEdition(b);
    setFormOuvert(true);
  }

  function confirmerDesactivation(b: Boisson) {
    Alert.alert("Désactiver la boisson", `Désactiver « ${b.designation} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Désactiver",
        style: "destructive",
        onPress: async () => {
          try {
            await desactiverBoisson(b.id);
            charger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Opération impossible.");
          }
        },
      },
    ]);
  }

  if (chargement && boissons.length === 0) return <LoadingView />;

  return (
    <Screen onRefresh={charger} refreshing={chargement}>
      <EtablissementSelector />
      {estProprietaire && (
        <Button title="+ Nouvelle boisson" onPress={ouvrirCreation} style={{ marginBottom: spacing.md }} />
      )}
      <ErrorBanner message={erreur} />

      {boissons.length === 0 ? (
        <EmptyView label="Aucune boisson." />
      ) : (
        boissons.map((b) => {
          const lib = libellesConditionnement(b.typeConditionnement);
          return (
            <Card key={b.id}>
              <View style={styles.cardHead}>
                <Text style={styles.nom}>{b.designation}</Text>
                {!b.actif && <Badge text="Inactive" tone="neutral" />}
              </View>
              {b.categorie ? <Badge text={b.categorie} tone="primary" /> : null}
              <View style={{ marginTop: spacing.sm }}>
                <Row label="Prix de vente" value={formatMontant(b.prixVenteUnitaire)} />
                <Row label={`Bouteilles / ${lib.singulier}`} value={formatNombre(b.bouteillesParConditionnement)} />
                <Row label="Seuil d'alerte" value={formatNombre(b.seuilAlerte)} />
                {estProprietaire && b.prixAchatCasier != null ? (
                  <Row label={`Prix d'achat / ${lib.singulier}`} value={formatMontant(b.prixAchatCasier)} />
                ) : null}
                {estProprietaire && b.prixRevientUnitaire != null ? (
                  <Row label="Prix de revient / unité" value={formatMontant(b.prixRevientUnitaire)} />
                ) : null}
              </View>
              {estProprietaire && (
                <View style={styles.actions}>
                  <Pressable style={styles.action} onPress={() => ouvrirEdition(b)}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                  </Pressable>
                  {b.actif && (
                    <Pressable style={styles.action} onPress={() => confirmerDesactivation(b)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>Désactiver</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          );
        })
      )}

      {estProprietaire && (
        <BoissonForm
          visible={formOuvert}
          boisson={edition}
          etablissements={etablissements}
          onClose={() => setFormOuvert(false)}
          onSaved={() => {
            setFormOuvert(false);
            charger();
          }}
        />
      )}
    </Screen>
  );
}

const TYPES = Object.keys(CONDITIONNEMENTS) as TypeConditionnement[];

function BoissonForm({
  visible,
  boisson,
  etablissements,
  onClose,
  onSaved,
}: {
  visible: boolean;
  boisson: Boisson | null;
  etablissements: { id: number; nom: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [designation, setDesignation] = useState("");
  const [type, setType] = useState<TypeConditionnement>("CASIER");
  const [bouteilles, setBouteilles] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [seuil, setSeuil] = useState("");
  const [categorie, setCategorie] = useState("");
  const [etabIds, setEtabIds] = useState<number[]>([]);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setErreur("");
    if (boisson) {
      setDesignation(boisson.designation);
      setType(boisson.typeConditionnement ?? "CASIER");
      setBouteilles(String(boisson.bouteillesParConditionnement));
      setPrixAchat(boisson.prixAchatCasier != null ? String(boisson.prixAchatCasier) : "");
      setPrixVente(String(boisson.prixVenteUnitaire));
      setSeuil(String(boisson.seuilAlerte));
      setCategorie(boisson.categorie ?? "");
      setEtabIds(boisson.etablissements?.map((e) => e.id) ?? []);
    } else {
      setDesignation("");
      setType("CASIER");
      setBouteilles("");
      setPrixAchat("");
      setPrixVente("");
      setSeuil("");
      setCategorie("");
      setEtabIds(etablissements.map((e) => e.id));
    }
  }, [visible, boisson, etablissements]);

  const lib = libellesConditionnement(type);

  function toggleEtab(id: number) {
    setEtabIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function soumettre() {
    setErreur("");
    if (!designation.trim() || !bouteilles || !prixVente || !seuil) {
      setErreur("Désignation, bouteilles, prix de vente et seuil sont requis.");
      return;
    }
    if (etabIds.length === 0) {
      setErreur("Sélectionnez au moins un établissement.");
      return;
    }
    const input: BoissonInput = {
      designation: designation.trim(),
      typeConditionnement: type,
      bouteillesParConditionnement: parseInt(bouteilles, 10) || 0,
      prixAchatCasier: prixAchat ? parseFloat(prixAchat) : 0,
      prixVenteUnitaire: parseFloat(prixVente) || 0,
      seuilAlerte: parseInt(seuil, 10) || 0,
      categorie: categorie.trim() || undefined,
      etablissementIds: etabIds,
    };
    setEnvoi(true);
    try {
      if (boisson) await modifierBoisson(boisson.id, input);
      else await creerBoisson(input);
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
            <Text style={styles.modalTitle}>{boisson ? "Modifier la boisson" : "Nouvelle boisson"}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorBanner message={erreur} />
            <Field label="Désignation" value={designation} onChangeText={setDesignation} placeholder="Ex. Bière Flag 60cl" />
            <Select
              label="Conditionnement"
              value={type}
              onChange={setType}
              options={TYPES.map((t) => ({ value: t, label: CONDITIONNEMENTS[t].singulier }))}
            />
            <Field
              label={`Bouteilles par ${lib.singulier}`}
              value={bouteilles}
              onChangeText={setBouteilles}
              keyboardType="number-pad"
            />
            <Field
              label={`Prix d'achat / ${lib.singulier}`}
              value={prixAchat}
              onChangeText={setPrixAchat}
              keyboardType="decimal-pad"
            />
            <Field label="Prix de vente / unité" value={prixVente} onChangeText={setPrixVente} keyboardType="decimal-pad" />
            <Field label="Seuil d'alerte (bouteilles)" value={seuil} onChangeText={setSeuil} keyboardType="number-pad" />
            <Field label="Catégorie (optionnel)" value={categorie} onChangeText={setCategorie} placeholder="Ex. Bière, Soda…" />

            <Text style={styles.label}>Établissements</Text>
            <View style={styles.chips}>
              {etablissements.map((e) => {
                const actif = etabIds.includes(e.id);
                return (
                  <Pressable key={e.id} onPress={() => toggleEtab(e.id)} style={[styles.chip, actif && styles.chipActif]}>
                    <Text style={[styles.chipText, actif && { color: colors.white }]}>{e.nom}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Button title="Enregistrer" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.md }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
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
    maxHeight: "92%",
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActif: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: fontSize.sm },
});
