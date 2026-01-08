import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "./icon-symbol";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "folder.fill",
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.muted + "20" }]}>
        <IconSymbol name={icon as any} size={48} color={colors.muted} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="md" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  actionContainer: {
    width: "100%",
    maxWidth: 200,
  },
});

