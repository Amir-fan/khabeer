import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Platform, StyleSheet, Animated, Dimensions, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Icons
const Icons = {
  check: (color = "#22C55E") => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  x: (color = "#9BA1A6") => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  crown: (color = "#D4AF37") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M2 17l3-12 5 6 2-8 2 8 5-6 3 12H2z" fill={color} stroke={color} strokeWidth={1} />
      <Path d="M2 17h20v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z" fill={color} />
    </Svg>
  ),
  star: (color = "#FFD700") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),
  expert: (color = "#D4AF37") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} fill={color} opacity={0.2} stroke={color} strokeWidth={1.5} />
      <Path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M15 3l2 2-2 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  rocket: (color = "#8B1538") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" fill={color} opacity={0.2} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  gift: (color = "#6B7280") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M20 12v10H4V12M2 7h20v5H2V7z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  back: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

// 3-Tier Subscription Model
const packages = [
  {
    id: "free",
    name: "خبير Free",
    nameEn: "Khabeer Free",
    price: 0,
    currency: "د.ك",
    period: "مجاني للأبد",
    description: "ابدأ رحلتك مع خبير",
    features: [
      { text: "محادثة AI عامة", included: true },
      { text: "فحص أساسي للأسهم", included: true },
      { text: "أخبار السوق", included: true },
      { text: "تحليل العقود", included: false },
      { text: "نسب التطهير الدقيقة", included: false },
      { text: "قوالب العقود", included: false },
    ],
    popular: false,
    bgColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    accentColor: "#64748B",
    icon: "gift",
    buttonText: "الباقة الحالية",
    buttonDisabled: true,
  },
  {
    id: "pro",
    name: "خبير Pro",
    nameEn: "Khabeer Pro",
    price: 8,
    currency: "د.ك",
    period: "شهرياً",
    description: "كل ما تحتاجه للتميز",
    features: [
      { text: "جميع مميزات Free", included: true },
      { text: "تحليل عقود كامل", included: true },
      { text: "نسب التطهير الدقيقة", included: true },
      { text: "تنبيهات الأسهم", included: true },
      { text: "قوالب العقود الجاهزة", included: true },
      { text: "أولوية في الدعم", included: true },
    ],
    popular: true,
    bgColor: "#FDF2F4",
    borderColor: "#8B1538",
    accentColor: "#8B1538",
    icon: "rocket",
    buttonText: "اشترك الآن",
    buttonDisabled: false,
  },
  {
    id: "expert",
    name: "سوق الخبراء",
    nameEn: "Expert Marketplace",
    price: null,
    currency: "د.ك",
    period: "حسب الطلب",
    priceRange: "40 - 100",
    description: "مراجعة خبير معتمد",
    features: [
      { text: "مراجعة خبير شرعي", included: true },
      { text: "ختم رسمي معتمد", included: true },
      { text: "توجيه ذكي للخبراء", included: true },
      { text: "تقرير مفصل موثق", included: true },
      { text: "ضمان جودة الخدمة", included: true },
      { text: "دعم مباشر 24/7", included: true },
    ],
    popular: false,
    bgColor: "#FFFBEB",
    borderColor: "#D4AF37",
    accentColor: "#D4AF37",
    icon: "expert",
    buttonText: "طلب خبير",
    buttonDisabled: false,
  },
];

export default function PackagesScreen() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string | null>("pro");
  const scaleAnims = useRef(packages.map(() => new Animated.Value(1))).current;

  const handleSelectPackage = (packageId: string, index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPackage(packageId);
    
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.98,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubscribe = (pkg: typeof packages[0]) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (pkg.id === "expert") {
      router.push("/consultant-request");
    } else if (pkg.id === "pro") {
      Alert.alert(
        "تأكيد الاشتراك",
        `سيتم اشتراكك في باقة ${pkg.name} بسعر ${pkg.price} ${pkg.currency} شهرياً\n\nاختر طريقة الدفع:`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "Apple Pay", onPress: () => processPayment(pkg, "apple_pay") },
          { text: "KNET", onPress: () => processPayment(pkg, "knet") },
        ]
      );
    }
  };

  const processPayment = async (pkg: typeof packages[0], method: string) => {
    // Show processing
    Alert.alert(
      "جاري المعالجة...",
      `يتم معالجة الدفع عبر ${method === 'apple_pay' ? 'Apple Pay' : 'KNET'}`,
      [{ text: "حسناً" }]
    );
    
    // Simulate payment processing
    setTimeout(() => {
      // In production, this would call the actual payment gateway
      Alert.alert(
        "✅ تم الدفع بنجاح!",
        `تم تفعيل باقة ${pkg.name} بنجاح.\n\nيمكنك الآن الاستمتاع بجميع المميزات المتقدمة.`,
        [{ text: "رائع!", onPress: () => router.back() }]
      );
    }, 1500);
  };

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case "gift": return Icons.gift(color);
      case "rocket": return Icons.rocket(color);
      case "expert": return Icons.expert(color);
      case "crown": return Icons.crown(color);
      default: return null;
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          {Icons.back("#11181C")}
        </Pressable>
        <Text style={styles.headerTitle}>الباقات</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>اختر خطتك المثالية</Text>
        <Text style={styles.heroSubtitle}>
          ابدأ مجاناً وقم بالترقية في أي وقت
        </Text>
      </View>

      {/* Packages */}
      <ScrollView 
        style={styles.packagesContainer}
        contentContainerStyle={styles.packagesContent}
        showsVerticalScrollIndicator={false}
      >
        {packages.map((pkg, index) => (
          <Animated.View
            key={pkg.id}
            style={[
              styles.packageWrapper,
              { transform: [{ scale: scaleAnims[index] }] },
            ]}
          >
            <Pressable
              onPress={() => handleSelectPackage(pkg.id, index)}
              style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
            >
              <View
                style={[
                  styles.packageCard,
                  { 
                    backgroundColor: pkg.bgColor,
                    borderColor: selectedPackage === pkg.id ? pkg.borderColor : "#E5E7EB",
                    borderWidth: selectedPackage === pkg.id ? 2 : 1,
                  },
                  pkg.popular && styles.popularCard,
                ]}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    {Icons.star("#FFD700")}
                    <Text style={styles.popularText}>الأكثر شعبية</Text>
                  </View>
                )}

                {/* Package Header */}
                <View style={styles.packageHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: pkg.accentColor + "15" }]}>
                    {renderIcon(pkg.icon || "gift", pkg.accentColor)}
                  </View>
                  <View style={styles.packageTitles}>
                    <Text style={[styles.packageName, { color: pkg.accentColor }]}>{pkg.name}</Text>
                    <Text style={styles.packageNameEn}>{pkg.nameEn}</Text>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.priceContainer}>
                  {pkg.price !== null ? (
                    <>
                      <Text style={[styles.priceValue, { color: pkg.accentColor }]}>{pkg.price}</Text>
                      <View style={styles.priceDetails}>
                        <Text style={styles.priceCurrency}>{pkg.currency}</Text>
                        <Text style={styles.pricePeriod}>/ {pkg.period}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.priceRange, { color: pkg.accentColor }]}>{pkg.priceRange}</Text>
                      <View style={styles.priceDetails}>
                        <Text style={styles.priceCurrency}>{pkg.currency}</Text>
                        <Text style={styles.pricePeriod}>/ {pkg.period}</Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={styles.packageDescription}>{pkg.description}</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {pkg.features.map((feature, fIndex) => (
                    <View key={fIndex} style={styles.featureRow}>
                      <View style={[
                        styles.featureIconContainer,
                        { backgroundColor: feature.included ? "#DCFCE7" : "#F1F5F9" }
                      ]}>
                        {feature.included ? Icons.check("#22C55E") : Icons.x("#94A3B8")}
                      </View>
                      <Text style={[
                        styles.featureText,
                        !feature.included && styles.featureTextDisabled,
                      ]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Subscribe Button */}
                <Pressable
                  onPress={() => !pkg.buttonDisabled && handleSubscribe(pkg)}
                  disabled={pkg.buttonDisabled}
                  style={({ pressed }) => [{ opacity: pressed && !pkg.buttonDisabled ? 0.9 : 1 }]}
                >
                  {pkg.popular ? (
                    <LinearGradient
                      colors={["#A91D4A", "#8B1538"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.subscribeButtonGradient}
                    >
                      <Text style={styles.subscribeButtonTextWhite}>{pkg.buttonText}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[
                      styles.subscribeButton,
                      pkg.buttonDisabled && styles.subscribeButtonDisabled,
                      !pkg.buttonDisabled && { borderColor: pkg.accentColor },
                    ]}>
                      <Text style={[
                        styles.subscribeButtonText,
                        pkg.buttonDisabled && styles.subscribeButtonTextDisabled,
                        !pkg.buttonDisabled && { color: pkg.accentColor },
                      ]}>
                        {pkg.buttonText}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            جميع الأسعار بالدينار الكويتي • يمكنك الإلغاء في أي وقت
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#11181C",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#11181C",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  packagesContainer: {
    flex: 1,
  },
  packagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  packageWrapper: {
    marginBottom: 16,
  },
  packageCard: {
    borderRadius: 20,
    padding: 20,
    position: "relative",
  },
  popularCard: {
    shadowColor: "#8B1538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  popularText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  packageTitles: {
    flex: 1,
  },
  packageName: {
    fontSize: 20,
    fontWeight: "800",
  },
  packageNameEn: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 40,
    fontWeight: "900",
  },
  priceRange: {
    fontSize: 32,
    fontWeight: "900",
  },
  priceDetails: {
    marginLeft: 6,
  },
  priceCurrency: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  pricePeriod: {
    fontSize: 13,
    color: "#94A3B8",
  },
  packageDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  featureTextDisabled: {
    color: "#94A3B8",
  },
  subscribeButtonGradient: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  subscribeButtonDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  subscribeButtonTextWhite: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  subscribeButtonTextDisabled: {
    color: "#94A3B8",
  },
  footerNote: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
});
