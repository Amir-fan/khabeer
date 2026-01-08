import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 16 : Math.max(insets.bottom, 12);
  const tabBarHeight = 64 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 12,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: Platform.OS === "ios" ? "transparent" : colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={colorScheme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "المحادثة",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <IconSymbol
                size={24}
                name={focused ? "message.fill" : "message"}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: "الخزنة",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <IconSymbol
                size={24}
                name={focused ? "folder.fill" : "folder"}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "الأخبار",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <IconSymbol
                size={24}
                name={focused ? "newspaper.fill" : "newspaper"}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <IconSymbol
                size={24}
                name={focused ? "person.fill" : "person"}
                color={color}
              />
            </View>
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapperActive: {
    backgroundColor: "rgba(139, 21, 56, 0.1)",
  },
});
