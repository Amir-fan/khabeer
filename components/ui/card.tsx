import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated";
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, variant = "default", style, onPress }: CardProps) {
  const colors = useColors();

  const cardStyle: ViewStyle[] = [
    styles.card,
    variant === "default" && { backgroundColor: colors.card, borderColor: colors.border },
    variant === "elevated" && { backgroundColor: colors.surface, borderColor: colors.border },
    style,
  ];

  if (onPress) {
    const Pressable = require("react-native").Pressable;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.8 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});

