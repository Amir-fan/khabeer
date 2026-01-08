import { useRef } from "react";
import { Animated, Pressable, PressableProps, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  className?: string;
  style?: ViewStyle | ViewStyle[];
  haptic?: boolean;
}

export function AnimatedPressable({
  children,
  onPress,
  className,
  style,
  disabled,
  haptic = true,
  ...props
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = (e: any) => {
    if (haptic && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        className={className}
        style={[style, { transform: [{ scale: scaleAnim }] }]}
      >
        {children as React.ReactNode}
      </Animated.View>
    </Pressable>
  );
}
