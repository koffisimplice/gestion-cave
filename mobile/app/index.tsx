import React from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/context/auth";
import { LoadingView } from "@/components/ui";
import { colors } from "@/theme";

/** Point d'entrée : redirige vers la connexion ou l'app selon l'état de session. */
export default function Index() {
  const { utilisateur, chargement } = useAuth();

  if (chargement) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingView label="Chargement…" />
      </View>
    );
  }

  return <Redirect href={utilisateur ? "/(tabs)" : "/login"} />;
}
