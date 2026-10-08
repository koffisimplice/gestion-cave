import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/auth";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { utilisateur, chargement } = useAuth();

  if (chargement) return null;
  if (!utilisateur) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tableau",
          tabBarLabel: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="registre"
        options={{
          title: "Registre du jour",
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="achats"
        options={{
          title: "Achats",
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="boissons"
        options={{
          title: "Boissons",
          tabBarIcon: ({ color, size }) => <Ionicons name="beer-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: "Plus",
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
