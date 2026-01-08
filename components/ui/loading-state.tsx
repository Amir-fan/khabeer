import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface LoadingStateProps {
  message?: string;
  size?: "small" | "large";
}

export function LoadingState({ message = "جاري التحميل...", size = "small" }: LoadingStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  message: {
    fontSize: 14,
  },
});

