import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/auth";
import { Button, ErrorBanner, Field } from "@/components/ui";
import { HttpError } from "@/api/client";
import { colors, fontSize, radius, spacing } from "@/theme";

export default function LoginScreen() {
  const { utilisateur, login } = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  if (utilisateur) return <Redirect href="/(tabs)" />;

  async function soumettre() {
    setErreur("");
    if (!email.trim() || !motDePasse) {
      setErreur("Renseignez votre identifiant et votre mot de passe.");
      return;
    }
    setEnvoi(true);
    try {
      await login(email.trim(), motDePasse);
    } catch (e) {
      if (e instanceof HttpError && e.status === 429) {
        setErreur("Trop de tentatives. Réessayez dans quelques minutes.");
      } else if (e instanceof HttpError && e.status === 401) {
        setErreur("Identifiant ou mot de passe incorrect.");
      } else {
        setErreur(e instanceof Error ? e.message : "Connexion impossible.");
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Ionicons name="wine" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Gestion Cave</Text>
        <Text style={styles.subtitle}>Connectez-vous à votre espace de gestion</Text>

        <View style={styles.form}>
          <ErrorBanner message={erreur} />

          <Field
            label="Identifiant (email ou téléphone)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="exemple@maquis.ci"
          />

          <View>
            <Field
              label="Mot de passe"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry={!voirMdp}
              placeholder="••••••••"
              style={{ paddingRight: 48 }}
            />
            <Pressable style={styles.eye} onPress={() => setVoirMdp((v) => !v)} hitSlop={10}>
              <Ionicons
                name={voirMdp ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Button title="Se connecter" onPress={soumettre} loading={envoi} style={{ marginTop: spacing.sm }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  logo: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  eye: { position: "absolute", right: spacing.md, top: 34 },
});
