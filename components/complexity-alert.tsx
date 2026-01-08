import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

interface ComplexityAlertProps {
  financialValue?: number; // In KWD
  keywords?: string[];
  aiConfidence?: number; // 0-100
  onHireExpert?: () => void;
  onDismiss?: () => void;
}

/**
 * Amber Alert Card - Shown when contract complexity triggers expert recommendation
 */
export function ComplexityAlert({
  financialValue,
  keywords = [],
  aiConfidence,
  onHireExpert,
  onDismiss,
}: ComplexityAlertProps) {
  const getTriggerReasons = () => {
    const reasons: string[] = [];
    
    if (financialValue && financialValue > 5000) {
      reasons.push(`قيمة عالية (${financialValue.toLocaleString()} د.ك)`);
    }
    
    if (keywords.length > 0) {
      const keywordMap: Record<string, string> = {
        "Arbitration": "تحكيم",
        "Dispute": "نزاع",
        "International": "دولي",
        "Penalty": "غرامة",
        "Guarantee": "ضمان",
      };
      const arabicKeywords = keywords.map(k => keywordMap[k] || k);
      reasons.push(`كلمات حساسة: ${arabicKeywords.join("، ")}`);
    }
    
    if (aiConfidence && aiConfidence < 85) {
      reasons.push(`ثقة الذكاء الاصطناعي: ${aiConfidence}%`);
    }
    
    return reasons;
  };

  const reasons = getTriggerReasons();

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
      {/* Amber Header */}
      <LinearGradient
        colors={["#F59E0B", "#D97706"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertTitle}>تنبيه: عقد عالي المخاطر</Text>
        </View>
      </LinearGradient>

      {/* Alert Body */}
      <View style={styles.body}>
        <Text style={styles.bodyText}>
          هذا العقد يتضمن عناصر معقدة. الذكاء الاصطناعي مفيد، لكن يُنصح بخبير بشري للالتزام القانوني.
        </Text>

        {/* Trigger Reasons */}
        {reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            <Text style={styles.reasonsTitle}>أسباب التنبيه:</Text>
            {reasons.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonBullet}>•</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={onHireExpert}
            style={({ pressed }) => [
              styles.expertButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={["#8B1538", "#C9375D"]}
              style={styles.expertGradient}
            >
              <Text style={styles.expertButtonText}>👨‍⚖️ استعن بخبير الآن</Text>
            </LinearGradient>
          </Pressable>

          {onDismiss && (
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.dismissText}>متابعة مع الذكاء الاصطناعي</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Complexity Evaluator - Determines if expert recommendation should be shown
 */
export interface ComplexityConfig {
  financialThreshold: number; // KWD
  sensitiveKeywords: string[];
  aiConfidenceThreshold: number; // 0-100
}

export const DEFAULT_COMPLEXITY_CONFIG: ComplexityConfig = {
  financialThreshold: 5000,
  sensitiveKeywords: ["Arbitration", "Dispute", "International", "Penalty", "Guarantee", "تحكيم", "نزاع", "دولي", "غرامة", "ضمان"],
  aiConfidenceThreshold: 85,
};

export function evaluateComplexity(
  analysis: {
    financialValue?: number;
    detectedKeywords?: string[];
    aiConfidence?: number;
  },
  config: ComplexityConfig = DEFAULT_COMPLEXITY_CONFIG
): {
  shouldRecommendExpert: boolean;
  triggers: string[];
  matchedKeywords: string[];
} {
  const triggers: string[] = [];
  const matchedKeywords: string[] = [];

  // Check financial value
  if (analysis.financialValue && analysis.financialValue > config.financialThreshold) {
    triggers.push("high_value");
  }

  // Check keywords
  if (analysis.detectedKeywords) {
    for (const keyword of analysis.detectedKeywords) {
      if (config.sensitiveKeywords.some(sk => 
        keyword.toLowerCase().includes(sk.toLowerCase()) ||
        sk.toLowerCase().includes(keyword.toLowerCase())
      )) {
        matchedKeywords.push(keyword);
      }
    }
    if (matchedKeywords.length > 0) {
      triggers.push("sensitive_keywords");
    }
  }

  // Check AI confidence
  if (analysis.aiConfidence && analysis.aiConfidence < config.aiConfidenceThreshold) {
    triggers.push("low_confidence");
  }

  return {
    shouldRecommendExpert: triggers.length > 0,
    triggers,
    matchedKeywords,
  };
}

/**
 * Mini Alert Card - Inline version for chat
 */
export function MiniComplexityAlert({
  onHireExpert,
}: {
  onHireExpert?: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.miniContainer}>
      <View style={styles.miniContent}>
        <Text style={styles.miniIcon}>🔶</Text>
        <View style={styles.miniTextContainer}>
          <Text style={styles.miniTitle}>عقد معقد</Text>
          <Text style={styles.miniSubtitle}>يُنصح بمراجعة خبير</Text>
        </View>
        <Pressable
          onPress={onHireExpert}
          style={({ pressed }) => [
            styles.miniButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.miniButtonText}>استعن بخبير</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    marginVertical: 12,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  body: {
    padding: 16,
  },
  bodyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    textAlign: "right",
  },
  reasonsContainer: {
    marginTop: 16,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  reasonBullet: {
    color: "#D97706",
    fontSize: 14,
  },
  reasonText: {
    fontSize: 13,
    color: "#78350F",
    flex: 1,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
  expertButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  expertGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  expertButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  dismissText: {
    color: "#6B7280",
    fontSize: 14,
  },
  // Mini Alert Styles
  miniContainer: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginVertical: 8,
  },
  miniContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  miniIcon: {
    fontSize: 24,
  },
  miniTextContainer: {
    flex: 1,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  miniSubtitle: {
    fontSize: 12,
    color: "#B45309",
  },
  miniButton: {
    backgroundColor: "#8B1538",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  miniButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
