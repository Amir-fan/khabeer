import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  const colors = useColors();

  const backgroundColor = getBackgroundColor(variant, colors);
  const textColor = getTextColor(variant, colors);

  return (
    <View style={[styles.badge, { backgroundColor, borderColor: textColor + "30" }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function getBackgroundColor(variant: BadgeVariant, colors: any): string {
  switch (variant) {
    case "success":
      return colors.success + "20";
    case "warning":
      return colors.warning + "20";
    case "error":
      return colors.error + "20";
    case "info":
      return colors.primary + "20";
    default:
      return colors.muted + "20";
  }
}

function getTextColor(variant: BadgeVariant, colors: any): string {
  switch (variant) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "error":
      return colors.error;
    case "info":
      return colors.primary;
    default:
      return colors.muted;
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});

