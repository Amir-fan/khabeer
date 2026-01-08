import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";

// Helper to add opacity to hex colors
const addOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
};

type Language = "ar" | "en" | "tr";

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingItem({ icon, title, subtitle, onPress, rightElement, showChevron = true }: SettingItemProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingItem,
        { borderBottomColor: colors.border },
        pressed && onPress && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
        <IconSymbol name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
      {showChevron && onPress && (
        <IconSymbol name="chevron.right" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { logout } = useAuth();
  const [language, setLanguage] = useState<Language>("ar");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Get real user data from API
  const { data: user, isLoading: isLoadingUser, error: userError } = trpc.auth.me.useQuery();
  
  // Update profile mutation
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      // Refetch user data
      // Note: tRPC will automatically refetch queries after mutation
    },
  });

  const isAuthenticated = !!user;

  const languages: { key: Language; label: string }[] = [
    { key: "ar", label: "العربية" },
    { key: "en", label: "English" },
    { key: "tr", label: "Türkçe" },
  ];

  const handleLanguageChange = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Cycle through languages
    const currentIndex = languages.findIndex((l) => l.key === language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex].key);
  };

  const handleDarkModeToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsDarkMode(value);
  };

  const handleNotificationsToggle = (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setNotificationsEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد من تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            logout();
          },
        },
      ]
    );
  };

  const getTierLabel = (tier: string | null | undefined): string => {
    switch (tier) {
      case "pro":
        return "برو";
      case "enterprise":
        return "مؤسسات";
      default:
        return "مجاني";
    }
  };

  const getTierColor = (tier: string | null | undefined): string => {
    switch (tier) {
      case "pro":
        return colors.accent;
      case "enterprise":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  const currentLanguageLabel = languages.find((l) => l.key === language)?.label || "العربية";

  if (isLoadingUser) {
    return (
      <ScreenContainer>
        <LoadingState message="جاري تحميل الملف الشخصي..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>الإعدادات</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "؟"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.name || "زائر"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.muted }]}>
              {user?.email || "قم بتسجيل الدخول للمزامنة"}
            </Text>
            {user?.phone && (
              <Text style={[styles.profilePhone, { color: colors.muted }]}>
                {user.phone}
              </Text>
            )}
          </View>
          <Badge 
            label={getTierLabel(user?.tier)} 
            variant={user?.tier === "pro" || user?.tier === "enterprise" ? "info" : "default"}
          />
        </View>

        {/* Subscription Section */}
        {isAuthenticated && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>الاشتراك</Text>
            {user?.tier === "free" && (
              <SettingItem
                icon="star.fill"
                title="ترقية للنسخة المميزة"
                subtitle="رفع ملفات، فحص أسهم غير محدود"
                onPress={() => {
                  // Navigate to packages screen or show upgrade modal
                  Alert.alert("ترقية", "ميزة الترقية قيد التطوير");
                }}
              />
            )}
            {(user?.tier === "pro" || user?.tier === "enterprise") && (
              <SettingItem
                icon="key.fill"
                title="مفتاح API"
                subtitle="للمطورين والشركات"
                onPress={() => {
                  Alert.alert("مفتاح API", "ميزة مفاتيح API قيد التطوير");
                }}
              />
            )}
            {user?.tier && (
              <View style={styles.tierInfo}>
                <Text style={[styles.tierInfoText, { color: colors.muted }]}>
                  الباقة الحالية: {getTierLabel(user.tier)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>التفضيلات</Text>
          <SettingItem
            icon="globe"
            title="اللغة"
            subtitle={currentLanguageLabel}
            onPress={handleLanguageChange}
          />
          <SettingItem
            icon="moon.fill"
            title="الوضع الداكن"
            showChevron={false}
            rightElement={
              <Switch
                value={isDarkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.border, true: addOpacity(colors.primary, 0.5) }}
                thumbColor={isDarkMode ? colors.primary : colors.surface}
              />
            }
          />
          <SettingItem
            icon="bell.fill"
            title="الإشعارات"
            showChevron={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.border, true: addOpacity(colors.primary, 0.5) }}
                thumbColor={notificationsEnabled ? colors.primary : colors.surface}
              />
            }
          />
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>حول التطبيق</Text>
          <SettingItem
            icon="info.circle.fill"
            title="عن ذمة"
            onPress={() => {}}
          />
          <SettingItem
            icon="doc.text.fill"
            title="سياسة الخصوصية"
            onPress={() => {}}
          />
          <SettingItem
            icon="questionmark.circle.fill"
            title="المساعدة والدعم"
            onPress={() => {}}
          />
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: addOpacity(colors.error, 0.1), borderColor: addOpacity(colors.error, 0.2) },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="arrow.right.square.fill" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>تسجيل الخروج</Text>
          </Pressable>
        )}

        {/* Version */}
        <Text style={[styles.version, { color: colors.muted }]}>
          ذمة الإصدار 1.0.0
        </Text>
      </ScrollView>
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
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
  },
  profilePhone: {
    fontSize: 12,
    marginTop: 2,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: "uppercase",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  tierInfo: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tierInfoText: {
    fontSize: 12,
  },
});
