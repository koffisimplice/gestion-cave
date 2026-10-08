import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEtablissement } from "@/context/etablissement";
import { useAuth } from "@/context/auth";
import { colors, fontSize, radius, spacing } from "@/theme";

/**
 * Barre de sélection d'établissement. Le propriétaire peut choisir « Tous
 * (consolidé) » ou un maquis précis ; le gérant est verrouillé sur le sien.
 */
export function EtablissementSelector() {
  const { etablissements, selection, setSelection } = useEtablissement();
  const { estProprietaire } = useAuth();
  const [ouvert, setOuvert] = useState(false);

  const libelle =
    selection === "consolide"
      ? "Tous les maquis (consolidé)"
      : etablissements.find((e) => e.id === selection)?.nom ?? "Établissement";

  // Le gérant n'a qu'un seul établissement : pas de sélecteur interactif.
  if (!estProprietaire && etablissements.length <= 1) {
    return (
      <View style={styles.bar}>
        <Ionicons name="business-outline" size={16} color={colors.textMuted} />
        <Text style={styles.barText} numberOfLines={1}>
          {libelle}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable style={styles.bar} onPress={() => setOuvert(true)}>
        <Ionicons name="business-outline" size={16} color={colors.primary} />
        <Text style={styles.barText} numberOfLines={1}>
          {libelle}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={ouvert} transparent animationType="fade" onRequestClose={() => setOuvert(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOuvert(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choisir un établissement</Text>
            <ScrollView>
              {estProprietaire && (
                <OptionRow
                  label="Tous les maquis (consolidé)"
                  actif={selection === "consolide"}
                  onPress={() => {
                    setSelection("consolide");
                    setOuvert(false);
                  }}
                />
              )}
              {etablissements.map((e) => (
                <OptionRow
                  key={e.id}
                  label={e.nom}
                  actif={selection === e.id}
                  onPress={() => {
                    setSelection(e.id);
                    setOuvert(false);
                  }}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function OptionRow({
  label,
  actif,
  onPress,
}: {
  label: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
      <Text style={[styles.optionText, actif && { color: colors.primary, fontWeight: "700" }]}>
        {label}
      </Text>
      {actif && <Ionicons name="checkmark" size={18} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  barText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: spacing.xl },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: "70%",
  },
  sheetTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginBottom: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: fontSize.md },
});
