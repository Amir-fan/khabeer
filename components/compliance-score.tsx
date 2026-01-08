import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { useAnimatedProps, withTiming, useSharedValue, withDelay } from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ComplianceScoreProps {
  score: number; // 0-100
  totalIssues?: number;
  criticalIssues?: number;
  onHireExpert?: () => void;
  isBlurred?: boolean;
}

export function ComplianceScore({
  score,
  totalIssues = 0,
  criticalIssues = 0,
  onHireExpert,
  isBlurred = false,
}: ComplianceScoreProps) {
  const progress = useSharedValue(0);
  
  React.useEffect(() => {
    progress.value = withDelay(300, withTiming(score / 100, { duration: 1500 }));
  }, [score]);

  // Determine risk level and colors
  const getRiskInfo = () => {
    if (score >= 90) {
      return {
        level: "آمن",
        levelEn: "Safe",
        colors: ["#22C55E", "#16A34A"] as const,
        bgColor: "#DCFCE7",
        textColor: "#166534",
      };
    } else if (score >= 50) {
      return {
        level: "مخاطر محتملة",
        levelEn: "Risks Detected",
        colors: ["#F59E0B", "#D97706"] as const,
        bgColor: "#FEF3C7",
        textColor: "#92400E",
      };
    } else {
      return {
        level: "خطر حرج",
        levelEn: "Critical Danger",
        colors: ["#EF4444", "#DC2626"] as const,
        bgColor: "#FEE2E2",
        textColor: "#991B1B",
      };
    }
  };

  const riskInfo = getRiskInfo();
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      {/* Circular Gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={riskInfo.colors[0]}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
            />
          </G>
        </Svg>
        
        {/* Score Display */}
        <View style={styles.scoreDisplay}>
          <Text style={[styles.scoreNumber, { color: riskInfo.colors[0] }]}>
            {score}
          </Text>
          <Text style={styles.scoreLabel}>نقطة الأمان</Text>
        </View>
      </View>

      {/* Risk Level Badge */}
      <View style={[styles.riskBadge, { backgroundColor: riskInfo.bgColor }]}>
        <Text style={[styles.riskText, { color: riskInfo.textColor }]}>
          {riskInfo.level}
        </Text>
      </View>

      {/* Issues Summary */}
      {totalIssues > 0 && (
        <View style={styles.issuesSummary}>
          <View style={styles.issueItem}>
            <Text style={styles.issueCount}>{totalIssues}</Text>
            <Text style={styles.issueLabel}>إجمالي المشاكل</Text>
          </View>
          {criticalIssues > 0 && (
            <View style={[styles.issueItem, styles.criticalItem]}>
              <Text style={[styles.issueCount, styles.criticalCount]}>{criticalIssues}</Text>
              <Text style={[styles.issueLabel, styles.criticalLabel]}>مشاكل حرجة</Text>
            </View>
          )}
        </View>
      )}

      {/* Blurred Warning for Free Users */}
      {isBlurred && criticalIssues > 0 && (
        <View style={styles.blurredWarning}>
          <Text style={styles.blurredIcon}>⚠️</Text>
          <Text style={styles.blurredText}>
            تم اكتشاف {criticalIssues} بنود ربوية حرجة
          </Text>
          <Text style={styles.blurredSubtext}>
            قم بالترقية إلى Pro لكشف التفاصيل وإصلاحها
          </Text>
        </View>
      )}

      {/* Hire Expert Button */}
      {score < 90 && onHireExpert && (
        <Pressable onPress={onHireExpert} style={({ pressed }) => [
          styles.expertButton,
          pressed && styles.expertButtonPressed
        ]}>
          <LinearGradient
            colors={["#8B1538", "#C9375D"]}
            style={styles.expertButtonGradient}
          >
            <Text style={styles.expertButtonText}>
              استعن بخبير للوصول إلى 100% أمان
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  gaugeContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  svg: {
    transform: [{ rotate: "0deg" }],
  },
  scoreDisplay: {
    position: "absolute",
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#687076",
    marginTop: -4,
  },
  riskBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  riskText: {
    fontSize: 14,
    fontWeight: "600",
  },
  issuesSummary: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  issueItem: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  criticalItem: {
    backgroundColor: "#FEE2E2",
  },
  issueCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#374151",
  },
  criticalCount: {
    color: "#DC2626",
  },
  issueLabel: {
    fontSize: 12,
    color: "#687076",
    marginTop: 4,
  },
  criticalLabel: {
    color: "#991B1B",
  },
  blurredWarning: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  blurredIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  blurredText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    textAlign: "center",
  },
  blurredSubtext: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 4,
    textAlign: "center",
  },
  expertButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  expertButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  expertButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  expertButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
