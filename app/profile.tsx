import { useState } from "react";
import { View, Text, ScrollView, Switch, Alert, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Rect } from "react-native-svg";

// Professional SVG Icons
const Icons = {
  back: (color = "#11181C") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  subscription: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  history: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  saved: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  partner: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  notifications: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  darkMode: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  language: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  help: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  privacy: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} stroke={color} strokeWidth={1.5} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  terms: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  about: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  edit: (color = "#FFFFFF") => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  arrow: (color = "#9BA1A6") => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  user: (color = "#FFFFFF") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  upgrade: (color = "#FFFFFF") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "تسجيل الخروج",
        "هل أنت متأكد من تسجيل الخروج؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "تسجيل الخروج",
            style: "destructive",
            onPress: async () => {
              await logout();
              router.replace("/auth");
            },
          },
        ]
      );
    } else {
      // Web: use window.confirm for better compatibility
      if (window.confirm("هل أنت متأكد من تسجيل الخروج؟")) {
        await logout();
        router.replace("/auth");
      }
    }
  };

  const menuItems = [
    {
      id: "subscription",
      icon: Icons.subscription,
      title: "الباقة والاشتراك",
      subtitle: user?.tier === "pro" ? "باقة Pro" : user?.tier === "enterprise" ? "باقة Enterprise" : "الباقة المجانية",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/packages");
      },
    },
    {
      id: "history",
      icon: Icons.history,
      title: "سجل المحادثات",
      subtitle: "عرض المحادثات السابقة",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert("قريباً", "سيتم إضافة سجل المحادثات قريباً");
      },
    },
    {
      id: "saved",
      icon: Icons.saved,
      title: "المحفوظات",
      subtitle: "الأسهم والفتاوى المحفوظة",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert("قريباً", "سيتم إضافة المحفوظات قريباً");
      },
    },
    {
      id: "partner",
      icon: Icons.partner,
      title: "تقدم للانضمام كشريك",
      subtitle: "كن شريكاً في منصة خبير",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/partner-signup");
      },
    },
  ];

  const settingsItems = [
    {
      id: "notifications",
      icon: Icons.notifications,
      title: "الإشعارات",
      type: "switch",
      value: notifications,
      onToggle: setNotifications,
    },
    {
      id: "darkMode",
      icon: Icons.darkMode,
      title: "الوضع الداكن",
      type: "switch",
      value: darkMode,
      onToggle: setDarkMode,
    },
    {
      id: "language",
      icon: Icons.language,
      title: "اللغة",
      subtitle: "العربية",
      type: "link",
      onPress: () => {},
    },
  ];

  const supportItems = [
    {
      id: "help",
      icon: Icons.help,
      title: "المساعدة والدعم",
      onPress: () => {},
    },
    {
      id: "privacy",
      icon: Icons.privacy,
      title: "سياسة الخصوصية",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/privacy" as any);
      },
    },
    {
      id: "terms",
      icon: Icons.terms,
      title: "الشروط والأحكام",
      onPress: () => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/terms" as any);
      },
    },
    {
      id: "about",
      icon: Icons.about,
      title: "عن التطبيق",
      subtitle: "الإصدار 1.0.0",
      onPress: () => {},
    },
  ];

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()}>
            <View style={styles.backButton}>
              {Icons.back("#11181C")}
            </View>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>حسابي</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Upgrade Banner */}
        <View style={styles.upgradeBannerContainer}>
          <AnimatedPressable 
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/packages");
            }}
          >
            <LinearGradient
              colors={["#8B1538", "#A91D4A"]}
              style={styles.upgradeBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.upgradeIconContainer}>
                {Icons.upgrade("#FFFFFF")}
              </View>
              <View style={styles.upgradeContent}>
                <Text style={styles.upgradeTitle}>ترقية إلى Pro</Text>
                <Text style={styles.upgradeSubtitle}>محادثات غير محدودة + مميزات حصرية</Text>
              </View>
              {Icons.arrow("#FFFFFF")}
            </LinearGradient>
          </AnimatedPressable>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCardContainer}>
          <LinearGradient
            colors={["#8B1538", "#A91D4A", "#C9375D"]}
            style={styles.profileCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {Icons.user("#FFFFFF")}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.name || "مستخدم خبير"}
                </Text>
                <Text style={styles.profileEmail}>{user?.email || "غير مسجل"}</Text>
              </View>
              <AnimatedPressable 
                style={styles.editButton}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert("قريباً", "سيتم إضافة تعديل الملف الشخصي قريباً");
                }}
              >
                {Icons.edit("#FFFFFF")}
              </AnimatedPressable>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>محادثة</Text>
              </View>
              <View style={[styles.statItem, styles.statItemBorder]}>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>ملف</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>سهم محفوظ</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <AnimatedPressable
                key={item.id}
                onPress={item.onPress}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
              >
                <View style={styles.menuIconContainer}>
                  {item.icon("#8B1538")}
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                {Icons.arrow("#9BA1A6")}
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإعدادات</Text>
          <View style={styles.menuCard}>
            {settingsItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.menuItem,
                  index < settingsItems.length - 1 && styles.menuItemBorder,
                ]}
              >
                <View style={styles.menuIconContainer}>
                  {item.icon("#8B1538")}
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                {item.type === "switch" ? (
                  <Switch
                    value={item.value}
                    onValueChange={(value) => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      item.onToggle(value);
                    }}
                    trackColor={{ false: "#E5E7EB", true: "#8B1538" }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E7EB"
                  />
                ) : (
                  <AnimatedPressable onPress={item.onPress}>
                    {Icons.arrow("#9BA1A6")}
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الدعم</Text>
          <View style={styles.menuCard}>
            {supportItems.map((item, index) => (
              <AnimatedPressable
                key={item.id}
                onPress={item.onPress}
                style={[
                  styles.menuItem,
                  index < supportItems.length - 1 && styles.menuItemBorder,
                ]}
              >
                <View style={styles.menuIconContainer}>
                  {item.icon("#8B1538")}
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                {Icons.arrow("#9BA1A6")}
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <AnimatedPressable
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#11181C",
  },
  upgradeBannerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#8B1538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  profileCardContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#8B1538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    flexDirection: "row",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 2,
    textAlign: "right",
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "right",
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  logoutButton: {
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
});
