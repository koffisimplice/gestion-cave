import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "@/theme";

// ---------- Carte ----------

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Titres ----------

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// ---------- Bouton ----------

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.danger
      : variant === "secondary"
      ? colors.surfaceAlt
      : "transparent";
  const textColor =
    variant === "ghost" ? colors.primary : variant === "secondary" ? colors.text : colors.white;
  const border = variant === "ghost" ? { borderWidth: 1, borderColor: colors.border } : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        border,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ---------- Champ texte ----------

export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ---------- Badge ----------

export function Badge({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "primary";
}) {
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    success: { bg: colors.successBg, fg: colors.success },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    warning: { bg: colors.warningBg, fg: colors.warning },
    primary: { bg: "#172554", fg: colors.primary },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

// ---------- États ----------

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.mutedText}>{label}</Text> : null}
    </View>
  );
}

export function EmptyView({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{message}</Text>
    </View>
  );
}

// ---------- Tuile KPI ----------

export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "primary";
}) {
  const color =
    tone === "success"
      ? colors.success
      : tone === "danger"
      ? colors.danger
      : tone === "warning"
      ? colors.warning
      : tone === "primary"
      ? colors.primary
      : colors.text;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

// ---------- Ligne clé/valeur ----------

export function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontSize: fontSize.md, fontWeight: "600" },
  label: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: fontSize.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  mutedText: { color: colors.textMuted, marginTop: spacing.md, fontSize: fontSize.md, textAlign: "center" },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing.xs },
  statValue: { fontSize: fontSize.lg, fontWeight: "700" },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  kvLabel: { color: colors.textMuted, fontSize: fontSize.sm, flexShrink: 1, paddingRight: spacing.sm },
  kvValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
});
