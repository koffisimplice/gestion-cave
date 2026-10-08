import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "@/theme";

export interface Option<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Liste déroulante (modal) générique pour les formulaires. */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Sélectionner…",
}: {
  label?: string;
  value: T | null | undefined;
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const courant = options.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.control} onPress={() => setOuvert(true)}>
        <Text style={[styles.controlText, !courant && { color: colors.textFaint }]} numberOfLines={1}>
          {courant?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={ouvert} transparent animationType="fade" onRequestClose={() => setOuvert(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOuvert(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  disabled={o.disabled}
                  style={styles.option}
                  onPress={() => {
                    onChange(o.value);
                    setOuvert(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      o.value === value && { color: colors.primary, fontWeight: "700" },
                      o.disabled && { color: colors.textFaint },
                    ]}
                  >
                    {o.label}
                  </Text>
                  {o.value === value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.xs },
  control: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  controlText: { color: colors.text, fontSize: fontSize.md, flex: 1, paddingRight: spacing.sm },
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
  optionText: { color: colors.text, fontSize: fontSize.md, flex: 1, paddingRight: spacing.sm },
});
