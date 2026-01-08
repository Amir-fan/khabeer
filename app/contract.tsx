import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface AnalysisResult {
  analysis: string;
  complianceScore: number;
  issues: string[];
  recommendations: string[];
}

export default function ContractScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeMutation = trpc.ai.analyzeContract.useMutation();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          size: file.size,
        });
        setResult(null);
      }
    } catch (error) {
      console.error("Document picker error:", error);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await analyzeMutation.mutateAsync({
        fileUrl: selectedFile.uri,
        fileName: selectedFile.name,
      });
      setResult(response as AnalysisResult);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("حدث خطأ أثناء تحليل العقد. يرجى المحاولة مرة أخرى.");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="chevron.right" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>تحليل العقود</Text>
        </View>

        {/* Upload Area */}
        <Pressable
          onPress={handlePickDocument}
          style={({ pressed }) => [
            styles.uploadArea,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={[styles.uploadIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="doc.text.fill" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
            {selectedFile ? "تغيير الملف" : "اختر ملف العقد"}
          </Text>
          <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>
            PDF, DOC, DOCX - حتى 10 ميجابايت
          </Text>
        </Pressable>

        {/* Selected File */}
        {selectedFile && (
          <View style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.fileIcon, { backgroundColor: colors.accent + "20" }]}>
              <IconSymbol name="doc.fill" size={24} color={colors.accent} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              {selectedFile.size && (
                <Text style={[styles.fileSize, { color: colors.muted }]}>
                  {formatFileSize(selectedFile.size)}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                setSelectedFile(null);
                setResult(null);
              }}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="xmark" size={20} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* Analyze Button */}
        {selectedFile && !result && (
          <Pressable
            onPress={handleAnalyze}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.analyzeButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              isLoading && { opacity: 0.7 },
            ]}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>جاري التحليل...</Text>
              </>
            ) : (
              <>
                <IconSymbol name="checkmark.shield.fill" size={22} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>تحليل العقد شرعياً</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Error Message */}
        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <Pressable
              onPress={() => setError(null)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="xmark" size={18} color={colors.error} />
            </Pressable>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
            <View style={styles.loadingSteps}>
              <View style={styles.loadingStep}>
                <View style={[styles.stepDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.stepText, { color: colors.foreground }]}>قراءة المستند</Text>
              </View>
              <View style={styles.loadingStep}>
                <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.stepText, { color: colors.foreground }]}>تحليل البنود</Text>
              </View>
              <View style={styles.loadingStep}>
                <View style={[styles.stepDot, { backgroundColor: colors.muted }]} />
                <Text style={[styles.stepText, { color: colors.muted }]}>إعداد التقرير</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result */}
        {result && !isLoading && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Score Header */}
            <View style={styles.scoreHeader}>
              <View>
                <Text style={[styles.scoreLabel, { color: colors.muted }]}>نسبة التوافق الشرعي</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(result.complianceScore) }]}>
                  {result.complianceScore}%
                </Text>
              </View>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(result.complianceScore) + "20" },
                ]}
              >
                <IconSymbol
                  name={result.complianceScore >= 70 ? "checkmark.shield.fill" : "exclamationmark.triangle.fill"}
                  size={28}
                  color={getScoreColor(result.complianceScore)}
                />
              </View>
            </View>

            {/* Analysis */}
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>التحليل الشرعي</Text>
              <Text style={[styles.analysisText, { color: colors.muted }]}>{result.analysis}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="square.and.arrow.up" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>تحميل التقرير</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(tabs)/chat")}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <IconSymbol name="bubble.left.fill" size={18} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>استفسار إضافي</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info Box */}
        {!selectedFile && (
          <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              قم برفع عقدك وسنقوم بتحليله من المنظور الشرعي وتحديد البنود المتوافقة والمخالفة للشريعة الإسلامية
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 12,
    transform: [{ scaleX: -1 }],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  uploadArea: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 36,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
  },
  uploadIcon: {
    width: 78,
    height: 78,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  fileSize: {
    fontSize: 13,
    color: "#6B7280",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    gap: 10,
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  loadingCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 16,
  },
  loadingSteps: {
    gap: 16,
  },
  loadingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 15,
  },
  resultCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
  },
  scoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
