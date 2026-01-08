import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// Helper to add opacity to hex colors
const addOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
};

interface StockResult {
  complianceStatus: "halal" | "haram" | "doubtful" | "insufficient_data";
  complianceScore: number | null;
  analysis: string;
  factors: string[];
  recommendation: string;
  dataAvailability?: string;
  uncertaintyNote?: string;
}

// Example search suggestions (UI only, not data)
const exampleSearches = [
  { symbol: "2222", name: "أرامكو السعودية" },
  { symbol: "1120", name: "الراجحي" },
];

export default function StockScreen() {
  const router = useRouter();
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<StockResult | null>(null);
  const [searchedSymbol, setSearchedSymbol] = useState("");

  const screenMutation = trpc.ai.screenStock.useMutation();
  
  const isLoading = screenMutation.isPending;
  const error = screenMutation.error;

  const handleSearch = async (symbol: string, name?: string) => {
    if (!symbol.trim()) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSearchedSymbol(symbol.trim());
    setResult(null);

    try {
      const response = await screenMutation.mutateAsync({
        symbol: symbol.trim(),
        name: name,
      });
      // Map backend response to frontend interface
      setResult({
        complianceStatus: response.complianceStatus,
        complianceScore: response.complianceScore ?? null,
        analysis: response.analysis,
        factors: response.factors,
        recommendation: response.recommendation,
        dataAvailability: response.dataAvailability,
        uncertaintyNote: response.uncertaintyNote,
      });
    } catch (error) {
      // Error is handled by mutation error state
      console.error("Stock screening error:", error);
    }
  };

  const getStatusColor = (status: StockResult["complianceStatus"]) => {
    switch (status) {
      case "halal":
        return colors.success;
      case "haram":
        return colors.error;
      case "doubtful":
        return colors.warning;
      case "insufficient_data":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: StockResult["complianceStatus"]) => {
    switch (status) {
      case "halal":
        return "حلال";
      case "haram":
        return "حرام";
      case "doubtful":
        return "مشتبه";
      case "insufficient_data":
        return "بيانات غير كافية";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: StockResult["complianceStatus"]) => {
    switch (status) {
      case "halal":
        return "checkmark.shield.fill";
      case "haram":
        return "xmark.shield.fill";
      case "doubtful":
        return "exclamationmark.triangle.fill";
      default:
        return "questionmark.circle.fill";
    }
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
          <Text style={[styles.title, { color: colors.foreground }]}>فحص الأسهم</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="ابحث برمز السهم أو اسم الشركة..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <IconSymbol name="xmark" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => handleSearch(searchQuery)}
            disabled={!searchQuery.trim() || isLoading}
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: searchQuery.trim() ? colors.primary : colors.muted },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.searchButtonText}>فحص</Text>
          </Pressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingState message={`جاري فحص السهم ${searchedSymbol}...`} size="large" />
          </View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <View style={[styles.errorContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={32} color={colors.error} />
            <Text style={[styles.errorTitle, { color: colors.error }]}>حدث خطأ</Text>
            <Text style={[styles.errorText, { color: colors.muted }]}>
              {error.message || "فشل في فحص السهم. يرجى المحاولة مرة أخرى."}
            </Text>
            <Pressable
              onPress={() => handleSearch(searchQuery)}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        )}

        {/* Result */}
        {result && !isLoading && !error && (
          <View style={styles.resultWrapper}>
            <Card variant="elevated" style={styles.resultCard}>
              {/* Status Header with Symbol */}
              <View style={[styles.statusHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.statusLeft}>
                  <Text style={[styles.symbolText, { color: colors.foreground }]}>{searchedSymbol}</Text>
                  <Badge 
                    label={getStatusLabel(result.complianceStatus)}
                    variant={
                      result.complianceStatus === "halal" ? "success" :
                      result.complianceStatus === "haram" ? "error" : "warning"
                    }
                  />
                </View>
                {result.complianceScore !== null && (
                  <View style={[styles.scoreContainer, { backgroundColor: addOpacity(getStatusColor(result.complianceStatus), 0.15) }]}>
                    <Text style={[styles.scoreValue, { color: getStatusColor(result.complianceStatus) }]}>
                      {result.complianceScore}%
                    </Text>
                    <Text style={[styles.scoreLabel, { color: getStatusColor(result.complianceStatus) }]}>التوافق</Text>
                  </View>
                )}
                {result.complianceScore === null && result.dataAvailability && (
                  <View style={[styles.scoreContainer, { backgroundColor: addOpacity(colors.muted, 0.15) }]}>
                    <IconSymbol name="questionmark.circle.fill" size={20} color={colors.muted} />
                    <Text style={[styles.scoreLabel, { color: colors.muted }]}>بيانات غير كافية</Text>
                  </View>
                )}
              </View>

              {/* Disclaimer */}
              <View style={[styles.disclaimerBox, { backgroundColor: addOpacity(colors.warning, 0.12), borderColor: addOpacity(colors.warning, 0.3) }]}>
                <IconSymbol name="info.circle.fill" size={18} color={colors.warning} />
                <Text style={[styles.disclaimerText, { color: colors.foreground }]}>
                  النتائج تعتمد على البيانات المتاحة وقد تتغير مع تحديث المعلومات
                </Text>
              </View>

              {/* Analysis */}
              <View style={styles.analysisSection}>
                <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                  <IconSymbol name="doc.text.fill" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>التحليل الشرعي</Text>
                </View>
                <Text style={[styles.analysisText, { color: colors.foreground }]}>{result.analysis}</Text>
              </View>

              {/* Factors */}
              {result.factors && result.factors.length > 0 && (
                <View style={styles.factorsSection}>
                  <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                    <IconSymbol name="list.bullet" size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>العوامل المؤثرة</Text>
                  </View>
                  <View style={styles.factorsList}>
                    {result.factors.map((factor, index) => (
                      <View key={index} style={[styles.factorItem, { borderBottomColor: colors.border }]}>
                        <View style={[styles.factorBullet, { backgroundColor: getStatusColor(result.complianceStatus) }]} />
                        <Text style={[styles.factorText, { color: colors.foreground }]}>{factor}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Uncertainty Note */}
              {result.uncertaintyNote && (
                <View style={[styles.alertBox, { backgroundColor: addOpacity(colors.warning, 0.12), borderColor: addOpacity(colors.warning, 0.3) }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={22} color={colors.warning} />
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertTitle, { color: colors.foreground }]}>تنبيه</Text>
                    <Text style={[styles.alertText, { color: colors.foreground }]}>
                      {result.uncertaintyNote}
                    </Text>
                  </View>
                </View>
              )}

              {/* Recommendation */}
              <View style={[styles.alertBox, { backgroundColor: addOpacity(colors.primary, 0.12), borderColor: addOpacity(colors.primary, 0.3) }]}>
                <IconSymbol name="lightbulb.fill" size={22} color={colors.primary} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: colors.foreground }]}>التوصية</Text>
                  <Text style={[styles.alertText, { color: colors.foreground }]}>
                    {result.recommendation}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Example Searches */}
        {!result && !isLoading && !error && (
          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أمثلة للبحث</Text>
            </View>
            <View style={styles.recentList}>
              {exampleSearches.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setSearchQuery(item.symbol);
                    handleSearch(item.symbol, item.name);
                  }}
                  style={({ pressed }) => [
                    styles.recentItem,
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={[styles.recentIcon, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
                    <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={[styles.recentSymbol, { color: colors.foreground }]}>{item.symbol}</Text>
                    <Text style={[styles.recentName, { color: colors.muted }]}>{item.name}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    marginRight: 12,
    transform: [{ scaleX: -1 }],
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    textAlign: "right",
    fontWeight: "400",
  },
  searchButton: {
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    marginHorizontal: 20,
    paddingVertical: 60,
  },
  errorContainer: {
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    minWidth: 120,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 0,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1.5,
    gap: 16,
  },
  statusLeft: {
    flex: 1,
    gap: 12,
  },
  symbolText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  scoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 100,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -1,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    margin: 20,
    marginBottom: 0,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  analysisSection: {
    padding: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  analysisText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
  },
  factorsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  factorsList: {
    marginTop: 8,
  },
  factorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  factorBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    flexShrink: 0,
  },
  factorText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 20,
    marginTop: 0,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  alertContent: {
    flex: 1,
    gap: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  recentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  recentList: {
    gap: 12,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recentInfo: {
    flex: 1,
    gap: 4,
  },
  recentSymbol: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  recentName: {
    fontSize: 14,
    fontWeight: "400",
  },
});
