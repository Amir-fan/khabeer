import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width, height } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: "1",
    title: "مرحباً بك في ذمة",
    subtitle: "مستشارك الشرعي الذكي",
    description:
      "منصة متكاملة للاستشارات المالية الإسلامية مدعومة بالذكاء الاصطناعي",
    icon: "sparkles",
    color: "#8B1538",
  },
  {
    id: "2",
    title: "اسأل أي سؤال",
    subtitle: "دردشة ذكية فورية",
    description:
      "احصل على إجابات شرعية موثقة لأسئلتك المالية من مصادر معتمدة",
    icon: "message.fill",
    color: "#D4A84B",
  },
  {
    id: "3",
    title: "فحص الأسهم",
    subtitle: "التوافق الشرعي",
    description:
      "تحقق من توافق الأسهم والاستثمارات مع الشريعة الإسلامية بضغطة زر",
    icon: "chart.line.uptrend.xyaxis",
    color: "#10B981",
  },
  {
    id: "4",
    title: "تحليل العقود",
    subtitle: "مراجعة شرعية",
    description:
      "ارفع عقودك واحصل على تحليل شرعي مفصل مع التوصيات",
    icon: "doc.text.magnifyingglass",
    color: "#6366F1",
  },
  {
    id: "5",
    title: "ابدأ الآن",
    subtitle: "مجاناً",
    description:
      "سجل دخولك للحصول على تجربة مخصصة وحفظ محادثاتك",
    icon: "arrow.right.circle.fill",
    color: "#8B1538",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const handleNext = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Mark onboarding as complete
      await AsyncStorage.setItem("onboarding_complete", "true");
      router.replace("/auth" as any);
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await AsyncStorage.setItem("onboarding_complete", "true");
    router.replace("/auth" as any);
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.slideContent}>
          {/* Icon with gradient background */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: item.color + "20" },
            ]}
          >
            <View
              style={[
                styles.iconInner,
                { backgroundColor: item.color },
              ]}
            >
              <IconSymbol
                name={item.icon as any}
                size={48}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Text content */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {item.title}
          </Text>
          <Text style={[styles.subtitle, { color: item.color }]}>
            {item.subtitle}
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: isActive ? colors.primary : colors.border,
                  width: isActive ? 24 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <Pressable
        onPress={handleSkip}
        style={[styles.skipButton, { top: insets.top + 16 }]}
      >
        <Text style={[styles.skipText, { color: colors.muted }]}>تخطي</Text>
      </Pressable>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {renderDots()}

        {/* Next/Get Started button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, "#C9375D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? "ابدأ الآن" : "التالي"}
            </Text>
            <IconSymbol
              name="chevron.left"
              size={20}
              color="#FFFFFF"
            />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: "absolute",
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: "center",
    maxWidth: 320,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
