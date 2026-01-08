import { useRef, useEffect } from "react";
import { Animated, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface AnimatedIconProps {
  icon: string;
  size?: number;
  colors?: [string, string];
  style?: ViewStyle;
  animate?: boolean;
  animationType?: "pulse" | "bounce" | "rotate" | "glow";
}

export function AnimatedIcon({
  icon,
  size = 48,
  colors = ["#8B1538", "#D4AF37"],
  style,
  animate = true,
  animationType = "pulse",
}: AnimatedIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!animate) return;

    let animation: Animated.CompositeAnimation;

    switch (animationType) {
      case "pulse":
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case "bounce":
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
            Animated.delay(2000),
          ])
        );
        break;

      case "rotate":
        animation = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          })
        );
        break;

      case "glow":
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.8,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        break;
    }

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animate, animationType]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { rotate: animationType === "rotate" ? spin : "0deg" },
    ],
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.Text
          style={{
            fontSize: size * 0.5,
            opacity: animationType === "glow" ? glowAnim : 1,
          }}
        >
          {icon}
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

// Pre-defined icon sets for the app
export const AppIcons = {
  chat: "💬",
  stock: "📊",
  contract: "📄",
  vault: "🔐",
  news: "📰",
  profile: "👤",
  settings: "⚙️",
  halal: "✅",
  haram: "❌",
  warning: "⚠️",
  star: "⭐",
  crown: "👑",
  rocket: "🚀",
  shield: "🛡️",
  brain: "🧠",
  book: "📚",
  money: "💰",
  chart: "📈",
  search: "🔍",
  bell: "🔔",
  heart: "❤️",
  fire: "🔥",
  sparkles: "✨",
  check: "✓",
  arrow: "→",
  plus: "➕",
  minus: "➖",
};
