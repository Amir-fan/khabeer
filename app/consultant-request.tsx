import { useState } from "react";
import { View, Text, ScrollView, TextInput, Alert, Platform, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import Svg, { Path, Circle } from "react-native-svg";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

// Icons
const Icons = {
  back: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  document: (color = "#8B1538") => (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M8 13h8M8 17h5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  expert: (color = "#D4AF37") => (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16.5 3l2 2-2 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  check: (color = "#22C55E") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

// Service Types with Pricing
const serviceTypes = [
  {
    id: "contract_review",
    name: "مراجعة عقد",
    description: "مراجعة شرعية كاملة للعقد مع تقرير مفصل",
    price: 40,
    currency: "د.ك",
    estimatedTime: "24-48 ساعة",
  },
  {
    id: "company_audit",
    name: "تدقيق شركة",
    description: "فحص شامل لنشاط الشركة والتوافق الشرعي",
    price: 75,
    currency: "د.ك",
    estimatedTime: "3-5 أيام",
  },
  {
    id: "investment_review",
    name: "مراجعة استثمار",
    description: "تقييم شرعي للفرصة الاستثمارية",
    price: 60,
    currency: "د.ك",
    estimatedTime: "2-3 أيام",
  },
  {
    id: "consultation",
    name: "استشارة مباشرة",
    description: "جلسة استشارية مع خبير شرعي",
    price: 100,
    currency: "د.ك",
    estimatedTime: "حسب الموعد",
  },
];

export default function ConsultantRequestScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createConsultationMutation = trpc.consultations.create.useMutation();
  const createFileMutation = trpc.files.create.useMutation();

  const handleSelectService = (serviceId: string) => {
    console.log("[ConsultantRequest] handleSelectService called with:", serviceId);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedService(serviceId);
    console.log("[ConsultantRequest] selectedService state updated to:", serviceId);
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedFile(result.assets[0].name);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedService) {
      Alert.alert("خطأ", "الرجاء اختيار نوع الخدمة");
      return;
    }

    if (!description.trim()) {
      Alert.alert("خطأ", "الرجاء كتابة وصف للطلب");
      return;
    }

    setIsSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const service = serviceTypes.find(s => s.id === selectedService);
    try {
      if (!isAuthenticated) {
        Alert.alert("تسجيل الدخول مطلوب", "يرجى تسجيل الدخول لإرسال طلب خبير شرعي.", [
          { text: "إلغاء", style: "cancel" },
          { text: "تسجيل الدخول", onPress: () => router.push("/auth") },
        ]);
        return;
      }

      // Optional: create a lightweight file record so the consultation can reference it.
      // (We keep UI unchanged; actual bytes upload can be implemented later via signed upload flow.)
      let fileRef: { fileId: number; name: string } | null = null;
      if (attachedFile) {
        const created = await createFileMutation.mutateAsync({
          name: attachedFile,
          type: "other",
        });
        fileRef = { fileId: created.id, name: attachedFile };
      }

      // Create real consultation record (server transitions to pending_advisor internally).
      await createConsultationMutation.mutateAsync({
        summary: description.trim(),
        grossAmountKwd: service?.price,
        files: fileRef ? [fileRef] : undefined,
      });

      Alert.alert(
        "تم إرسال الطلب",
        `سيتم توجيه طلبك لأفضل خبير متاح.\n\nالتكلفة المتوقعة: ${service?.price} ${service?.currency}\nالوقت المتوقع: ${service?.estimatedTime}\n\nسيتم التواصل معك قريباً لتأكيد الطلب والدفع.`,
        [{ text: "حسناً", onPress: () => router.back() }],
      );
    } catch (err: any) {
      const message =
        err?.data?.code === "UNAUTHORIZED"
          ? "يرجى تسجيل الدخول لإرسال الطلب."
          : err?.message || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.";
      Alert.alert("خطأ", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceData = serviceTypes.find(s => s.id === selectedService);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()}>
          <View style={styles.backButton}>
            {Icons.back()}
          </View>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>طلب خبير شرعي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Expert Icon */}
        <View style={styles.iconContainer}>
          {Icons.expert("#D4AF37")}
          <Text style={styles.subtitle}>
            سيتم توجيه طلبك لأفضل خبير متاح
          </Text>
        </View>

        {/* Service Selection */}
        <Text style={styles.sectionTitle}>اختر نوع الخدمة</Text>
        <View style={styles.servicesContainer}>
          {serviceTypes.map((service) => {
            const isSelected = selectedService === service.id;
            const handleClick = () => {
              console.log("[ConsultantRequest] Service clicked:", service.id);
              handleSelectService(service.id);
            };
            
            const cardContent = (
              <>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {isSelected && Icons.check("#8B1538")}
                </View>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                <View style={styles.serviceFooter}>
                  <Text style={styles.servicePrice}>
                    {service.price} {service.currency}
                  </Text>
                  <Text style={styles.serviceTime}>⏱️ {service.estimatedTime}</Text>
                </View>
              </>
            );
            
            if (Platform.OS === "web") {
              // Web: Use TouchableOpacity with explicit event handling
              return (
                <TouchableOpacity
                  key={service.id}
                  onPress={(e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    console.log("[ConsultantRequest] TouchableOpacity onPress:", service.id);
                    handleClick();
                  }}
                  onPressIn={() => {
                    console.log("[ConsultantRequest] TouchableOpacity onPressIn:", service.id);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                  ]}
                  // Ensure it's clickable on web
                  accessible={true}
                  accessibilityRole="button"
                >
                  {cardContent}
                </TouchableOpacity>
              );
            }
            
            // Native: Use Pressable
            return (
              <Pressable
                key={service.id}
                onPress={handleClick}
                style={[
                  styles.serviceCard,
                  isSelected && styles.serviceCardSelected,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {cardContent}
              </Pressable>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>وصف الطلب</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="اكتب تفاصيل طلبك هنا..."
          placeholderTextColor="#9BA1A6"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlign="right"
        />

        {/* File Attachment */}
        <Text style={styles.sectionTitle}>إرفاق ملف (اختياري)</Text>
        <AnimatedPressable onPress={handleAttachFile}>
          <View style={styles.attachContainer}>
            {Icons.document("#8B1538")}
            <Text style={styles.attachText}>
              {attachedFile || "اضغط لإرفاق ملف PDF أو صورة"}
            </Text>
          </View>
        </AnimatedPressable>

        {/* Price Summary */}
        {selectedServiceData && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>ملخص الطلب</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>الخدمة:</Text>
              <Text style={styles.summaryValue}>{selectedServiceData.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>التكلفة:</Text>
              <Text style={styles.summaryPrice}>
                {selectedServiceData.price} {selectedServiceData.currency}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>عمولة المنصة (30%):</Text>
              <Text style={styles.summaryValue}>
                {(selectedServiceData.price * 0.3).toFixed(1)} {selectedServiceData.currency}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowLast]}>
              <Text style={styles.summaryLabel}>للخبير (70%):</Text>
              <Text style={styles.summaryValue}>
                {(selectedServiceData.price * 0.7).toFixed(1)} {selectedServiceData.currency}
              </Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={isSubmitting || !selectedService}
        >
          <LinearGradient
            colors={selectedService ? ["#D4AF37", "#B8962E"] : ["#9BA1A6", "#9BA1A6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </Text>
          </LinearGradient>
        </AnimatedPressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#11181C",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 12,
    textAlign: "right",
  },
  servicesContainer: {
    marginBottom: 24,
  },
  serviceCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    cursor: Platform.OS === "web" ? "pointer" : "default",
  },
  serviceCardSelected: {
    borderColor: "#8B1538",
    backgroundColor: "#FDF2F4",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
  },
  serviceDescription: {
    fontSize: 13,
    color: "#687076",
    marginBottom: 12,
    textAlign: "right",
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B1538",
  },
  serviceTime: {
    fontSize: 12,
    color: "#687076",
  },
  descriptionInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#11181C",
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  attachContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  attachText: {
    marginTop: 12,
    fontSize: 14,
    color: "#687076",
  },
  summaryContainer: {
    backgroundColor: "#FDF8E8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 12,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#687076",
  },
  summaryValue: {
    fontSize: 14,
    color: "#11181C",
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D4AF37",
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
