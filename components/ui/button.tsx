import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const colors = useColors();

  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle[] = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.button_fullWidth,
    isDisabled && styles.button_disabled,
    { backgroundColor: getBackgroundColor(variant, colors) },
    { borderColor: getBorderColor(variant, colors) },
    style,
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    { color: getTextColor(variant, colors) },
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && !isDisabled && styles.button_pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor(variant, colors)} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function getBackgroundColor(variant: ButtonVariant, colors: any): string {
  switch (variant) {
    case "primary":
      return colors.primary;
    case "secondary":
      return colors.surface;
    case "text":
      return "transparent";
    case "danger":
      return colors.error;
    default:
      return colors.primary;
  }
}

function getBorderColor(variant: ButtonVariant, colors: any): string {
  switch (variant) {
    case "secondary":
      return colors.border;
    default:
      return "transparent";
  }
}

function getTextColor(variant: ButtonVariant, colors: any): string {
  switch (variant) {
    case "primary":
    case "danger":
      return "#FFFFFF";
    case "secondary":
    case "text":
      return variant === "text" ? colors.primary : colors.foreground;
    default:
      return "#FFFFFF";
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    gap: 8,
  },
  button_primary: {},
  button_secondary: {},
  button_text: {
    borderWidth: 0,
  },
  button_danger: {},
  button_sm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 36,
  },
  button_md: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 44,
  },
  button_lg: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 52,
  },
  button_fullWidth: {
    width: "100%",
  },
  button_disabled: {
    opacity: 0.4,
  },
  button_pressed: {
    opacity: 0.8,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  text_primary: {},
  text_secondary: {},
  text_text: {
    fontWeight: "500",
  },
  text_danger: {},
  text_sm: {
    fontSize: 13,
  },
  text_md: {
    fontSize: 15,
  },
  text_lg: {
    fontSize: 17,
  },
});

