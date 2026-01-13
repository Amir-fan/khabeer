import { useState } from "react";
import { View, Text, ScrollView, Switch, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
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
  };

  const menuItems = [
    {
      id: "subscription",
      icon: "💎",
      title: "الباقة والاشتراك",
      subtitle: user?.tier === "pro" ? "باقة Pro" : user?.tier === "enterprise" ? "باقة Enterprise" : "الباقة المجانية",
      onPress: () => router.push("/packages"),
    },
    {
      id: "history",
      icon: "📜",
      title: "سجل المحادثات",
      subtitle: "عرض المحادثات السابقة",
      onPress: () => {
        // TODO: Implement conversation history
        Alert.alert("قريباً", "سيتم إضافة سجل المحادثات قريباً");
      },
    },
    {
      id: "saved",
      icon: "⭐",
      title: "المحفوظات",
      subtitle: "الأسهم والفتاوى المحفوظة",
      onPress: () => {
        // TODO: Implement saved items
        Alert.alert("قريباً", "سيتم إضافة المحفوظات قريباً");
      },
    },
    {
      id: "partner",
      icon: "🤝",
      title: "تقدم للانضمام كشريك",
      subtitle: "كن شريكاً في منصة خبير",
      onPress: () => router.push("/partner-signup"),
    },
  ];

  const settingsItems = [
    {
      id: "notifications",
      icon: "🔔",
      title: "الإشعارات",
      type: "switch",
      value: notifications,
      onToggle: setNotifications,
    },
    {
      id: "darkMode",
      icon: "🌙",
      title: "الوضع الداكن",
      type: "switch",
      value: darkMode,
      onToggle: setDarkMode,
    },
    {
      id: "language",
      icon: "🌐",
      title: "اللغة",
      subtitle: "العربية",
      type: "link",
      onPress: () => {},
    },
  ];

  const supportItems = [
    {
      id: "help",
      icon: "❓",
      title: "المساعدة والدعم",
      onPress: () => {},
    },
    {
      id: "privacy",
      icon: "🔒",
      title: "سياسة الخصوصية",
      onPress: () => router.push("/privacy" as any),
    },
    {
      id: "terms",
      icon: "📋",
      title: "الشروط والأحكام",
      onPress: () => router.push("/terms" as any),
    },
    {
      id: "about",
      icon: "ℹ️",
      title: "عن التطبيق",
      subtitle: "الإصدار 1.0.0",
      onPress: () => {},
    },
  ];

  const formatStat = (value?: number | null) => {
    if (value === null || value === undefined) return "—";
    return `${value}`;
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <AnimatedPressable onPress={() => router.back()}>
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-border">
              <Text className="text-lg">→</Text>
            </View>
          </AnimatedPressable>
          <Text className="text-xl font-bold text-foreground">حسابي</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Upgrade Banner */}
        <View className="px-5 mb-4">
          <AnimatedPressable onPress={() => router.push("/packages")}>
            <LinearGradient
              colors={["#D4A574", "#C9375D"]}
              className="rounded-2xl p-4 flex-row items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-3">
                <Text className="text-2xl">⚡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">ترقية إلى Pro</Text>
                <Text className="text-white/80 text-sm">محادثات غير محدودة + مميزات حصرية</Text>
              </View>
              <Text className="text-white text-xl">←</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>

        {/* Profile Card */}
        <View className="px-5 mb-6">
          <LinearGradient
            colors={["#8B1538", "#C9375D"]}
            className="rounded-3xl p-6"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="flex-row items-center gap-4">
                <View className="w-16 h-16 bg-white/15 rounded-2xl items-center justify-center">
                  <Text className="text-2xl text-white">👤</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-xl mb-1">
                    {user?.name || "مستخدم خبير"}
                  </Text>
                  <Text className="text-white/80 text-sm">{user?.email || "غير مسجل"}</Text>
                </View>
                <AnimatedPressable className="bg-white/15 px-4 py-2 rounded-full">
                  <Text className="text-white text-sm">تعديل</Text>
                </AnimatedPressable>
            </View>

            {/* Stats - TODO: Fetch from API */}
              <View className="flex-row mt-6 pt-4 border-t border-white/15">
                <View className="flex-1 items-center">
                  <Text className="text-white font-bold text-xl">
                    —
                  </Text>
                  <Text className="text-white/80 text-xs">محادثة</Text>
                </View>
                <View className="flex-1 items-center border-x border-white/15">
                  <Text className="text-white font-bold text-xl">
                    —
                  </Text>
                  <Text className="text-white/80 text-xs">ملف</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-white font-bold text-xl">
                    —
                  </Text>
                  <Text className="text-white/80 text-xs">سهم محفوظ</Text>
                </View>
              </View>
          </LinearGradient>
        </View>

        {/* Menu Items */}
        <View className="px-5 mb-6">
          <Text className="text-muted text-sm mb-3">الحساب</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            {menuItems.map((item, index) => (
              <AnimatedPressable
                key={item.id}
                onPress={item.onPress}
                className={`flex-row items-center p-4 ${
                  index < menuItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center">
                  <Text className="text-xl">{item.icon}</Text>
                </View>
                <View className="flex-1 mr-3">
                  <Text className="text-foreground font-medium text-right">
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text className="text-muted text-sm text-right">
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <Text className="text-muted">←</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View className="px-5 mb-6">
          <Text className="text-muted text-sm mb-3">الإعدادات</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            {settingsItems.map((item, index) => (
              <View
                key={item.id}
                className={`flex-row items-center p-4 ${
                  index < settingsItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center">
                  <Text className="text-xl">{item.icon}</Text>
                </View>
                <View className="flex-1 mr-3">
                  <Text className="text-foreground font-medium text-right">
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text className="text-muted text-sm text-right">
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                {item.type === "switch" ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: "#E5E7EB", true: "#8B1538" }}
                    thumbColor="#fff"
                  />
                ) : (
                  <AnimatedPressable onPress={item.onPress}>
                    <Text className="text-muted">←</Text>
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Support */}
        <View className="px-5 mb-6">
          <Text className="text-muted text-sm mb-3">الدعم</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden">
            {supportItems.map((item, index) => (
              <AnimatedPressable
                key={item.id}
                onPress={item.onPress}
                className={`flex-row items-center p-4 ${
                  index < supportItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center">
                  <Text className="text-xl">{item.icon}</Text>
                </View>
                <View className="flex-1 mr-3">
                  <Text className="text-foreground font-medium text-right">
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text className="text-muted text-sm text-right">
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <Text className="text-muted">←</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View className="px-5 mb-8">
          <AnimatedPressable
            onPress={handleLogout}
            className="bg-error/10 py-4 rounded-2xl items-center"
          >
            <Text className="text-error font-semibold text-lg">تسجيل الخروج</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
