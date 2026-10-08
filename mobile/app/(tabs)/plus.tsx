import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors, fontSize, radius, spacing } from "@/theme";

interface Item {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  proprietaire?: boolean;
}

const OPERATIONS: Item[] = [
  { label: "Historique des ventes", icon: "time-outline", route: "/historique" },
];

const FINANCES: Item[] = [
  { label: "Marges & bénéfices", icon: "trending-up-outline", route: "/marges", proprietaire: true },
  { label: "Charges & rentabilité", icon: "wallet-outline", route: "/charges", proprietaire: true },
  { label: "Personnel & paie", icon: "people-outline", route: "/personnel", proprietaire: true },
];

const ADMIN: Item[] = [
  { label: "Établissements", icon: "business-outline", route: "/etablissements", proprietaire: true },
  { label: "Fournisseurs", icon: "cube-outline", route: "/fournisseurs", proprietaire: true },
  { label: "Utilisateurs", icon: "person-circle-outline", route: "/utilisateurs", proprietaire: true },
  { label: "Journal d'audit", icon: "shield-checkmark-outline", route: "/audit", proprietaire: true },
];

export default function PlusScreen() {
  const { utilisateur, estProprietaire, logout } = useAuth();
  const router = useRouter();

  function groupe(titre: string, items: Item[]) {
    const visibles = items.filter((i) => !i.proprietaire || estProprietaire);
    if (visibles.length === 0) return null;
    return (
      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.groupTitle}>{titre}</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {visibles.map((item, idx) => (
            <Pressable
              key={item.route}
              style={[styles.row, idx < visibles.length - 1 && styles.rowBorder]}
              onPress={() => router.push(item.route as never)}
            >
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>
      </View>
    );
  }

  function confirmerDeconnexion() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <Screen>
      <Card>
        <View style={styles.profil}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{utilisateur?.nom}</Text>
            <Text style={styles.role}>{estProprietaire ? "Propriétaire" : "Gérant"}</Text>
          </View>
        </View>
      </Card>

      {groupe("Opérations", OPERATIONS)}
      {groupe("Finances", FINANCES)}
      {groupe("Administration", ADMIN)}

      <Pressable style={styles.logout} onPress={confirmerDeconnexion}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profil: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  nom: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  role: { color: colors.textMuted, fontSize: fontSize.sm },
  groupTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontSize: fontSize.md, fontWeight: "700" },
});
