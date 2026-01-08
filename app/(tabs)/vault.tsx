import { useState, useMemo } from "react";
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

type FileCategory = "all" | "contracts" | "reports" | "stocks" | "other";

const categories: { key: FileCategory; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "contracts", label: "العقود" },
  { key: "reports", label: "التقارير" },
  { key: "stocks", label: "الأسهم" },
  { key: "other", label: "أخرى" },
];

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "غير معروف";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

export default function VaultScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch files from API
  const { data: files, isLoading, error, refetch } = trpc.files.list.useQuery(
    selectedCategory === "all" ? undefined : { type: selectedCategory as "contract" | "report" | "stock" | "other" },
    { enabled: true }
  );

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (selectedCategory === "all") return files;
    return files;
  }, [files, selectedCategory]);

  const getFileIcon = (type: VaultFile["type"]) => {
    switch (type) {
      case "contract":
        return "doc.text.fill";
      case "report":
        return "doc.fill";
      case "stock":
        return "chart.line.uptrend.xyaxis";
      default:
        return "doc.fill";
    }
  };

  const getStatusVariant = (status: string): "success" | "warning" | "error" | "default" => {
    switch (status) {
      case "analyzed":
        return "success";
      case "pending":
      case "analyzing":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "analyzed":
        return "تم التحليل";
      case "pending":
        return "قيد الانتظار";
      case "analyzing":
        return "قيد المعالجة";
      case "error":
        return "خطأ";
      default:
        return status;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCategoryPress = (category: FileCategory) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(category);
  };

  const renderFileItem = ({ item }: { item: typeof files[0] }) => (
    <Pressable
      style={({ pressed }) => [
        styles.fileCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.fileIconContainer, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
        <IconSymbol name={getFileIcon(item.type) as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.fileMetaRow}>
          <Text style={[styles.fileMeta, { color: colors.muted }]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.size && (
            <>
              <Text style={[styles.fileMeta, { color: colors.muted }]}> • </Text>
              <Text style={[styles.fileMeta, { color: colors.muted }]}>
                {formatFileSize(item.size)}
              </Text>
            </>
          )}
        </View>
      </View>
      <Badge label={getStatusLabel(item.status)} variant={getStatusVariant(item.status)} />
    </Pressable>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>الخزنة</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          ملفاتك وتقاريرك المحفوظة
        </Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <Pressable
            key={category.key}
            onPress={() => handleCategoryPress(category.key)}
            style={({ pressed }) => [
              styles.categoryTab,
              selectedCategory === category.key
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === category.key ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Files List */}
      {isLoading && !files ? (
        <LoadingState message="جاري تحميل الملفات..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            حدث خطأ في تحميل الملفات
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
          data={filteredFiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFileItem}
          contentContainerStyle={[
            styles.filesList,
            filteredFiles.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="folder.fill"
              title="لا توجد ملفات"
              subtitle="ابدأ برفع عقد أو فحص سهم لتظهر ملفاتك هنا"
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

      {/* Upload FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
      >
        <IconSymbol name="plus.circle.fill" size={28} color="#FFFFFF" />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filesList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: "row",
  },
  fileMeta: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
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
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

