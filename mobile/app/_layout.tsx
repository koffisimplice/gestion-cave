import "react-native-gesture-handler";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { AuthProvider } from "@/context/auth";
import { EtablissementProvider } from "@/context/etablissement";
import { colors } from "@/theme";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <AuthProvider>
          <EtablissementProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: "700" },
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="historique" options={{ title: "Historique" }} />
              <Stack.Screen name="marges" options={{ title: "Marges & bénéfices" }} />
              <Stack.Screen name="charges" options={{ title: "Charges & rentabilité" }} />
              <Stack.Screen name="personnel" options={{ title: "Personnel & paie" }} />
              <Stack.Screen name="fournisseurs" options={{ title: "Fournisseurs" }} />
              <Stack.Screen name="etablissements" options={{ title: "Établissements" }} />
              <Stack.Screen name="utilisateurs" options={{ title: "Utilisateurs" }} />
              <Stack.Screen name="audit" options={{ title: "Journal d'audit" }} />
            </Stack>
          </EtablissementProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
