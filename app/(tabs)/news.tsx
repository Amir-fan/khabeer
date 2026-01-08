import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";

// Helper to add opacity to hex colors
const addOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
};

type NewsCategory = "all" | "stocks" | "gold" | "fatwas" | "markets";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "غير معروف";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

const categories: { key: NewsCategory; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "stocks", label: "الأسهم" },
  { key: "gold", label: "الذهب" },
  { key: "fatwas", label: "الفتاوى" },
  { key: "markets", label: "الأسواق" },
];

export default function NewsScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch news from API
  const { data: news, isLoading, error, refetch } = trpc.news.list.useQuery(
    selectedCategory === "all" ? undefined : { category: selectedCategory },
    { enabled: true }
  );

  const handleCategoryPress = (category: NewsCategory) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(category);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getCategoryIcon = (category: NewsItem["category"]) => {
    switch (category) {
      case "stocks":
        return "chart.line.uptrend.xyaxis";
      case "gold":
        return "star.fill";
      case "fatwas":
        return "doc.text.fill";
      case "markets":
        return "globe";
      default:
        return "newspaper.fill";
    }
  };

  const renderNewsItem = ({ item }: { item: typeof news[0] }) => {
    const category = item.category || "markets";
    return (
      <Pressable
        style={({ pressed }) => [
          styles.newsCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
              <IconSymbol name={getCategoryIcon(category) as any} size={14} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.newsTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.summary && (
            <Text style={[styles.newsSummary, { color: colors.muted }]} numberOfLines={2}>
              {item.summary}
            </Text>
          )}
          <View style={styles.newsFooter}>
            {item.source && (
              <Text style={[styles.newsSource, { color: colors.primary }]}>{item.source}</Text>
            )}
            <Text style={[styles.newsDate, { color: colors.muted }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.headerIcon, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
            <IconSymbol name="newspaper.fill" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>الأخبار المالية</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.foreground }]}>
          آخر أخبار التمويل الإسلامي
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleCategoryPress(item.key)}
              style={({ pressed }) => [
                styles.categoryChip,
                selectedCategory === item.key
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: selectedCategory === item.key ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* News List */}
      {isLoading && !news ? (
        <LoadingState message="جاري تحميل الأخبار..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            حدث خطأ في تحميل الأخبار
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={news || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNewsItem}
          contentContainerStyle={[
            styles.newsList,
            (!news || news.length === 0) && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper.fill"
              title="لا توجد أخبار"
              subtitle="لا توجد أخبار متاحة حالياً"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 4,
  },
  categoryContainer: {
    paddingVertical: 12,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  newsList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  newsCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  newsContent: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  halalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  halalText: {
    fontSize: 11,
    fontWeight: "600",
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: 8,
  },
  newsSummary: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  newsSource: {
    fontSize: 13,
    fontWeight: "500",
  },
  newsDate: {
    fontSize: 12,
  },
  emptyList: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
