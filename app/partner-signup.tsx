import { useState } from "react";
import { View, Text, ScrollView, TextInput, Alert, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { LinearGradient } from "expo-linear-gradient";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";

// Icons
const Icons = {
  back: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

export default function PartnerSignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMutation = trpc.partnerApplications.submit.useMutation();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert("خطأ", "الرجاء إدخال الاسم الكامل");
      return;
    }
    if (!email.trim()) {
      Alert.alert("خطأ", "الرجاء إدخال البريد الإلكتروني");
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setIsSubmitting(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const result = await submitMutation.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        title: title.trim() || undefined,
        specialization: specialization.trim() || undefined,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
        bio: bio.trim() || undefined,
      });

      Alert.alert(
        "تم إرسال الطلب",
        "شكراً لتقديمك! سيتم مراجعة طلبك من قبل فريقنا وسنتواصل معك قريباً.",
        [
          {
            text: "حسناً",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "خطأ",
        error?.message || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()}>
          <View style={styles.backButton}>
            {Icons.back()}
          </View>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>طلب الانضمام كشريك</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          أكمل البيانات التالية للتقديم كشريك في منصة خبير
        </Text>

        {/* Required Fields */}
        <Text style={styles.sectionTitle}>البيانات الأساسية *</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الاسم الكامل *</Text>
          <TextInput
            style={styles.input}
            placeholder="أدخل اسمك الكامل"
            placeholderTextColor="#9BA1A6"
            value={fullName}
            onChangeText={setFullName}
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>البريد الإلكتروني *</Text>
          <TextInput
            style={styles.input}
            placeholder="example@email.com"
            placeholderTextColor="#9BA1A6"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>كلمة المرور *</Text>
          <TextInput
            style={styles.input}
            placeholder="8 أحرف على الأقل"
            placeholderTextColor="#9BA1A6"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            style={styles.input}
            placeholder="+965 12345678"
            placeholderTextColor="#9BA1A6"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textAlign="right"
          />
        </View>

        {/* Professional Info */}
        <Text style={styles.sectionTitle}>المعلومات المهنية</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>اللقب/المنصب</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: دكتور، أستاذ، مستشار"
            placeholderTextColor="#9BA1A6"
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>التخصص</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: الفقه المالي، الاقتصاد الإسلامي"
            placeholderTextColor="#9BA1A6"
            value={specialization}
            onChangeText={setSpecialization}
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>سنوات الخبرة</Text>
          <TextInput
            style={styles.input}
            placeholder="عدد السنوات"
            placeholderTextColor="#9BA1A6"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            keyboardType="number-pad"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>نبذة عنك</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب نبذة مختصرة عن خبرتك ومؤهلاتك..."
            placeholderTextColor="#9BA1A6"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={["#D4AF37", "#B8962E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
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
  subtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#11181C",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
