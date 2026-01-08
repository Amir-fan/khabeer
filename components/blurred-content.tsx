import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

interface BlurredContentProps {
  issueCount: number;
  issueType?: string; // "riba", "gharar", "general"
  onUpgrade?: () => void;
  children?: React.ReactNode;
}

export function BlurredContent({
  issueCount,
  issueType = "general",
  onUpgrade,
  children,
}: BlurredContentProps) {
  const getIssueTypeText = () => {
    switch (issueType) {
      case "riba":
        return "بنود ربوية";
      case "gharar":
        return "بنود غرر";
      default:
        return "مشاكل";
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      {/* Blurred Background Content */}
      <View style={styles.blurredSection}>
        {children || (
          <View style={styles.placeholderContent}>
            <View style={styles.placeholderLine} />
            <View style={[styles.placeholderLine, { width: "80%" }]} />
            <View style={[styles.placeholderLine, { width: "60%" }]} />
            <View style={styles.placeholderLine} />
            <View style={[styles.placeholderLine, { width: "70%" }]} />
          </View>
        )}
        
        {/* Blur Overlay */}
        <BlurView intensity={20} style={styles.blurOverlay}>
          <View style={styles.blurContent} />
        </BlurView>
      </View>

      {/* Warning Card */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>محتوى مقيد</Text>
        </View>
        
        <Text style={styles.warningText}>
          اكتشف الذكاء الاصطناعي{" "}
          <Text style={styles.highlightText}>{issueCount} {getIssueTypeText()} حرجة</Text>
        </Text>
        
        <Text style={styles.warningSubtext}>
          قم بالترقية إلى Pro لكشف التفاصيل وإصلاحها
        </Text>

        {onUpgrade && (
          <Pressable
            onPress={onUpgrade}
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.upgradeButtonPressed,
            ]}
          >
            <LinearGradient
              colors={["#8B1538", "#C9375D"]}
              style={styles.upgradeGradient}
            >
              <Text style={styles.upgradeText}>🔓 فتح المحتوى الكامل</Text>
            </LinearGradient>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Component to show blurred analysis results
 */
interface BlurredAnalysisProps {
  issues: Array<{
    title: string;
    severity: "critical" | "warning" | "info";
    description?: string;
  }>;
  isBlurred: boolean;
  onUpgrade?: () => void;
}

export function BlurredAnalysis({
  issues,
  isBlurred,
  onUpgrade,
}: BlurredAnalysisProps) {
  if (!isBlurred) {
    // Show full content for Pro users
    return (
      <View style={styles.analysisContainer}>
        {issues.map((issue, index) => (
          <View
            key={index}
            style={[
              styles.issueCard,
              issue.severity === "critical" && styles.criticalCard,
              issue.severity === "warning" && styles.warningCardStyle,
            ]}
          >
            <View style={styles.issueHeader}>
              <Text style={styles.severityIcon}>
                {issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟠" : "🔵"}
              </Text>
              <Text style={[
                styles.issueTitle,
                issue.severity === "critical" && styles.criticalTitle,
              ]}>
                {issue.title}
              </Text>
            </View>
            {issue.description && (
              <Text style={styles.issueDescription}>{issue.description}</Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  // Show blurred content for Free users
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  
  return (
    <BlurredContent
      issueCount={criticalCount || issues.length}
      issueType="riba"
      onUpgrade={onUpgrade}
    >
      <View style={styles.analysisContainer}>
        {issues.slice(0, 3).map((issue, index) => (
          <View key={index} style={styles.blurredIssueCard}>
            <View style={styles.blurredIssueLine} />
            <View style={[styles.blurredIssueLine, { width: "60%" }]} />
          </View>
        ))}
      </View>
    </BlurredContent>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  blurredSection: {
    position: "relative",
    padding: 16,
    minHeight: 120,
  },
  placeholderContent: {
    gap: 12,
  },
  placeholderLine: {
    height: 16,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    width: "100%",
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  blurContent: {
    flex: 1,
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    padding: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#92400E",
  },
  warningText: {
    fontSize: 14,
    color: "#78350F",
    textAlign: "center",
    marginBottom: 8,
  },
  highlightText: {
    fontWeight: "bold",
    color: "#DC2626",
  },
  warningSubtext: {
    fontSize: 12,
    color: "#A16207",
    textAlign: "center",
    marginBottom: 16,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  upgradeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  upgradeGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  upgradeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  analysisContainer: {
    gap: 12,
  },
  issueCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  criticalCard: {
    backgroundColor: "#FEF2F2",
    borderLeftColor: "#DC2626",
  },
  warningCardStyle: {
    backgroundColor: "#FFFBEB",
    borderLeftColor: "#F59E0B",
  },
  issueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  severityIcon: {
    fontSize: 16,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  criticalTitle: {
    color: "#DC2626",
  },
  issueDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  blurredIssueCard: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  blurredIssueLine: {
    height: 12,
    backgroundColor: "#D1D5DB",
    borderRadius: 4,
    width: "100%",
  },
});
