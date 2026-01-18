import { View, Text, StyleSheet, Platform } from "react-native";
import { AnimatedPressable } from "@/components/animated-pressable";
import Svg, { Path, Circle, Rect } from "react-native-svg";

// Category icons (reused from news.tsx)
const CategoryIcons = {
  stocks: (color: string) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3v18h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 14l4-4 3 3 6-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  sukuk: (color: string) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M3 10h18M7 15h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  banking: (color: string) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  fatwa: (color: string) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  default: (color: string) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
};

// Category labels mapping
const categoryLabels: Record<string, string> = {
  stocks: "الأسهم",
  sukuk: "الصكوك",
  banking: "البنوك",
  fatwa: "الفتاوى",
  fatwas: "الفتاوى", // Handle both singular and plural (schema uses "fatwas")
  gold: "الذهب",
  markets: "الأسواق",
  general: "عام",
};

export interface NewsCardProps {
  id: number;
  title: string;
  body?: string | null;
  summary?: string | null;
  source?: string | null;
  date?: string | null;
  category: string;
  onPress?: () => void;
}

export function NewsCard({ title, body, summary, source, date, category, onPress }: NewsCardProps) {
  // Get category label
  const categoryLabel = categoryLabels[category] || category;
  
  // Get category icon
  const getCategoryIcon = () => {
    if (category === "stocks") return CategoryIcons.stocks;
    if (category === "sukuk") return CategoryIcons.sukuk;
    if (category === "banking") return CategoryIcons.banking;
    if (category === "fatwa" || category === "fatwas") return CategoryIcons.fatwa;
    return CategoryIcons.default;
  };

  // Format date in Arabic
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Get excerpt from body or summary (3-4 lines max)
  const getExcerpt = () => {
    const text = summary || body || "";
    if (!text) return "";
    // Truncate to approximately 120 characters (roughly 3-4 lines)
    if (text.length <= 120) return text;
    return text.slice(0, 120).trim() + "...";
  };

  const excerpt = getExcerpt();
  const IconComponent = getCategoryIcon();

  return (
    <AnimatedPressable
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.95}
    >
      <View style={styles.cardContent}>
        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          {IconComponent("#8B1538")}
          <Text style={styles.categoryText}>{categoryLabel}</Text>
        </View>

        {/* Source */}
        {source && (
          <Text style={styles.sourceText} numberOfLines={1}>
            {source}
          </Text>
        )}

        {/* Date */}
        {date && (
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Excerpt */}
        {excerpt && (
          <Text style={styles.excerpt} numberOfLines={4}>
            {excerpt}
          </Text>
        )}

        {/* Read More (optional) */}
        {excerpt && (summary || body) && (summary?.length || body?.length || 0) > 120 && (
          <Text style={styles.readMore}>اقرأ المزيد</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 1, // Square (1:1 ratio)
    backgroundColor: "#FAFAF8", // Off-white background
    borderRadius: 12, // Slightly smaller radius
    borderWidth: 1,
    borderColor: "#E8E6E0", // Subtle border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    padding: 12, // Reduced padding for more compact cards
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#8B153815", // Very light red tint
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8B1538",
    textAlign: "right",
  },
  sourceText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "right",
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
    lineHeight: 20,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "right",
    lineHeight: 18,
    flex: 1,
    marginBottom: 6,
  },
  readMore: {
    fontSize: 11,
    fontWeight: "500",
    color: "#8B1538",
    textAlign: "right",
    marginTop: "auto",
  },
});
