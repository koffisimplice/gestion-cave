import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors, spacing } from "@/theme";

/**
 * Conteneur d'écran défilant, avec marges cohérentes et support du
 * « tirer pour rafraîchir ».
 */
export function Screen({
  children,
  onRefresh,
  refreshing,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  if (!scroll) {
    return <View style={[styles.container, styles.content, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
