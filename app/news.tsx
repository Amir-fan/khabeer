import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, RefreshControl, ActivityIndicator, StyleSheet, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";

// Beautiful News Icons
const Icons = {
  back: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  newspaper: (color: string) => (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M7 7h5v4H7V7z" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.2} />
      <Path d="M14 7h3M14 10h3M7 13h10M7 16h10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  stocks: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3v18h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 14l4-4 3 3 6-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  sukuk: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M3 10h18M7 15h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  banking: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  fatwa: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  all: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  clock: (color: string) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  source: (color: string) => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
};

const categories = [
  { id: "all", label: "الكل", icon: Icons.all },
  { id: "stocks", label: "الأسهم", icon: Icons.stocks },
  { id: "sukuk", label: "الصكوك", icon: Icons.sukuk },
  { id: "banking", label: "البنوك", icon: Icons.banking },
  { id: "fatwa", label: "الفتاوى", icon: Icons.fatwa },
];

export default function NewsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Try to fetch news from API, but don't fail if API is not available
  const { data: newsData, refetch, isLoading } = trpc.news.list.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 20,
  }, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on failure
    enabled: true,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await refetch();
    setRefreshing(false);
  };

  const news = newsData || [];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.icon || Icons.all;
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
            {Icons.back("#687076")}
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <LinearGradient colors={["#D4A574", "#C9B896"]} style={styles.headerIcon}>
              {Icons.newspaper("#FFFFFF")}
            </LinearGradient>
            <Text style={styles.headerTitle}>الأخبار المالية</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => (
            <AnimatedPressable
              key={cat.id}
              onPress={() => {
                setSelectedCategory(cat.id);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={StyleSheet.flatten([
                styles.categoryChip,
                selectedCategory === cat.id ? styles.categoryChipActive : {},
              ])}
            >
              {cat.icon(selectedCategory === cat.id ? "#FFFFFF" : "#687076")}
              <Text style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive,
              ]}>
                {cat.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        {/* News List */}
        <ScrollView
          style={styles.newsList}
          contentContainerStyle={styles.newsContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4A574"
              colors={["#D4A574"]}
            />
          }
        >
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4A574" />
              <Text style={styles.loadingText}>جاري تحميل الأخبار...</Text>
            </View>
          )}
          
          {!isLoading && news.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>{Icons.newspaper("#C9B896")}</View>
              <Text style={styles.emptyTitle}>لا توجد أخبار حالياً</Text>
              <Text style={styles.emptySubtitle}>سيتم عرض الأخبار الشرعية والمالية هنا فور توفرها.</Text>
            </View>
          )}

          {!isLoading && news.length > 0 && news.map((item: any) => (
            <Animated.View
              key={item.id}
              style={[
                styles.newsCard,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              <AnimatedPressable style={styles.newsCardInner}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.newsImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.newsBody}>
                  <View style={styles.newsHeader}>
                    <View style={styles.categoryBadge}>
                      {getCategoryIcon(item.category)("#8B1538")}
                      <Text style={styles.categoryBadgeText}>
                        {categories.find((c) => c.id === item.category)?.label || item.category}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      {Icons.source("#9BA1A6")}
                      <Text style={styles.metaText}>{item.source || "غير معروف"}</Text>
                    </View>
                  </View>
                  <Text style={styles.newsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.summary ? (
                    <Text style={styles.newsSummary} numberOfLines={3}>
                      {item.summary}
                    </Text>
                  ) : null}
                  <View style={styles.newsFooter}>
                    {Icons.clock("#9BA1A6")}
                    <Text style={styles.newsDate}>
                      {formatDate(item.publishedAt)}
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#11181C",
  },
  placeholder: {
    width: 44,
  },
  categoriesScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F0",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#8B1538",
    borderColor: "#8B1538",
  },
  categoryLabel: {
    fontSize: 14,
    color: "#687076",
  },
  categoryLabelActive: {
    color: "#FFFFFF",
  },
  newsList: {
    flex: 1,
  },
  newsContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: "#9BA1A6",
    marginTop: 16,
  },
  newsCard: {
    marginBottom: 16,
  },
  newsCardInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  newsImage: {
    width: "100%",
    height: 160,
  },
  newsBody: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8B153815",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#8B1538",
    fontWeight: "500",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sourceText: {
    fontSize: 12,
    color: "#687076",
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#11181C",
    textAlign: "right",
    marginBottom: 8,
    lineHeight: 26,
  },
  newsSummary: {
    fontSize: 14,
    color: "#687076",
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  newsDate: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#F5F5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9BA1A6",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 22,
  },
});
