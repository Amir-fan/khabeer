import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { AnimatedPressable } from "@/components/animated-pressable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle,
  signInWithApple,
  resetPassword,
  resendVerificationEmail 
} from "@/lib/supabase";

type AuthMode = "login" | "register";

// Guest storage keys
const GUEST_MODE_KEY = "khabeer_guest_mode";
const GUEST_ATTEMPTS_KEY = "khabeer_guest_attempts";
const GUEST_ATTEMPTS_DATE_KEY = "khabeer_guest_attempts_date";

// Country codes
const countryCodes = [
  { code: "+966", country: "السعودية", flag: "🇸🇦" },
  { code: "+971", country: "الإمارات", flag: "🇦🇪" },
  { code: "+965", country: "الكويت", flag: "🇰🇼" },
  { code: "+973", country: "البحرين", flag: "🇧🇭" },
  { code: "+968", country: "عمان", flag: "🇴🇲" },
  { code: "+974", country: "قطر", flag: "🇶🇦" },
  { code: "+20", country: "مصر", flag: "🇪🇬" },
  { code: "+962", country: "الأردن", flag: "🇯🇴" },
  { code: "+90", country: "تركيا", flag: "🇹🇷" },
  { code: "+1", country: "أمريكا", flag: "🇺🇸" },
  { code: "+44", country: "بريطانيا", flag: "🇬🇧" },
];

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(countryCodes[0]);

  const showError = (message: string) => {
    setErrorMessage(message);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const showSuccess = (title: string, message: string, onPress?: () => void) => {
    if (Platform.OS === "web") {
      alert(`${title}\n\n${message}`);
      onPress?.();
    } else {
      Alert.alert(title, message, [{ text: "حسناً", onPress }]);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, "").replace(/^0+/, "");
    return /^[0-9]{7,12}$/.test(cleanPhone);
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsGoogleLoading(true);
    setErrorMessage("");
    try {
      // Clear guest mode when user explicitly logs in with Google
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const { data, error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // For web, the redirect will happen automatically
      // For native, we need to handle the URL
      if (Platform.OS !== "web" && data?.url) {
        // The URL will be handled by the OAuth callback
        console.log("[Auth] Google OAuth URL:", data.url);
      }
    } catch (error: any) {
      console.error("[Auth] Google login error:", error);
      showError("عذراً، فشل تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsAppleLoading(true);
    setErrorMessage("");
    try {
      // Clear guest mode when user explicitly logs in with Apple
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const { data, error } = await signInWithApple();
      
      if (error) {
        throw error;
      }
      
      // For web, the redirect will happen automatically
      if (Platform.OS !== "web" && data?.url) {
        console.log("[Auth] Apple OAuth URL:", data.url);
      }
    } catch (error: any) {
      console.error("[Auth] Apple login error:", error);
      showError("عذراً، فشل تسجيل الدخول بـ Apple. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrorMessage("");
    
    if (!email || !password) {
      showError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    if (!validateEmail(email)) {
      showError("يرجى إدخال بريد إلكتروني صحيح (مثال: example@email.com)");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      // Clear guest mode when user explicitly logs in
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const { data, error } = await signInWithEmail(email, password);
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("يرجى تأكيد بريدك الإلكتروني أولاً");
        }
        throw error;
      }
      
      if (data?.user) {
        console.log("[Auth] Login successful:", data.user.email);
        await refresh();
        router.replace("/");
      }
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      showError(error.message || "عذراً، فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage("");
    
    // Validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (name.length < 3) {
      showError("الاسم يجب أن يكون 3 أحرف على الأقل");
      return;
    }

    if (!validateEmail(email)) {
      showError("يرجى إدخال بريد إلكتروني صحيح (مثال: example@email.com)");
      return;
    }

    if (!validatePhone(phone)) {
      showError("يرجى إدخال رقم هاتف صحيح (7-12 رقم بدون كود الدولة)");
      return;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      showError("كلمة المرور غير متطابقة");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      // Clear guest mode when user explicitly registers
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const fullPhone = countryCode.code + phone.replace(/^0+/, "");
      
      const { data, error } = await signUpWithEmail(email, password, {
        name,
        phone: fullPhone,
      });
      
      if (error) {
        if (error.message.includes("already registered")) {
          throw new Error("هذا البريد الإلكتروني مسجل مسبقاً");
        }
        throw error;
      }
      
      if (data?.user) {
        console.log("[Auth] Registration successful:", data.user.email);
        
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          showSuccess(
            "تم إنشاء الحساب! 🎉",
            "تم إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى التحقق من بريدك لتفعيل الحساب.",
            () => setMode("login")
          );
        } else {
          showSuccess(
            "تم إنشاء الحساب بنجاح! 🎉",
            "يمكنك الآن تسجيل الدخول",
            () => setMode("login")
          );
        }
        
        // Clear form
        setName("");
        setPhone("");
        setConfirmPassword("");
        setPassword("");
      }
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      showError(error.message || "عذراً، فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showError("يرجى إدخال البريد الإلكتروني أولاً");
      return;
    }

    if (!validateEmail(email)) {
      showError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        throw error;
      }
      
      showSuccess(
        "تم الإرسال! 📧",
        "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
      );
    } catch (error: any) {
      console.error("[Auth] Password reset error:", error);
      showError("عذراً، فشل إرسال رابط إعادة التعيين. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const today = new Date().toDateString();
    await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
    await AsyncStorage.setItem(GUEST_ATTEMPTS_KEY, "5");
    await AsyncStorage.setItem(GUEST_ATTEMPTS_DATE_KEY, today);
    
    router.replace("/");
  };

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
            <LinearGradient
              colors={["#8B1538", "#C9375D"]}
              style={styles.logoContainer}
            >
              <Text style={styles.logoText}>خ</Text>
            </LinearGradient>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {mode === "login"
                ? "سجل دخولك للوصول إلى مستشارك الشرعي"
                : "أنشئ حسابك للبدء في استخدام خبير"}
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Google Login Button */}
            <AnimatedPressable
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
              style={{
                ...styles.socialButton,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="logo-google" size={24} color={colors.foreground} style={{ marginLeft: 8 }} />
              <Text style={[styles.socialButtonText, { color: colors.foreground }]}>
                {isGoogleLoading ? "جاري التحميل..." : "المتابعة مع Google"}
              </Text>
            </AnimatedPressable>

            {/* Apple Login Button */}
            <AnimatedPressable
              onPress={handleAppleLogin}
              disabled={isAppleLoading}
              style={{
                ...styles.socialButton,
                backgroundColor: "#000",
                borderColor: "#000",
                marginTop: 12,
              }}
            >
              <Ionicons name="logo-apple" size={24} color="#fff" style={{ marginLeft: 8 }} />
              <Text style={[styles.socialButtonText, { color: "#fff" }]}>
                {isAppleLoading ? "جاري التحميل..." : "المتابعة مع Apple"}
              </Text>
            </AnimatedPressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>أو</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {mode === "register" && (
              <>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    الاسم الكامل <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="أدخل اسمك الكامل"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                  />
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    رقم الهاتف <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View style={styles.phoneRow}>
                    <AnimatedPressable
                      onPress={() => setShowCountryPicker(true)}
                      style={[
                        styles.countryCodeButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{countryCode.flag}</Text>
                      <Text style={[styles.countryCodeText, { color: colors.foreground }]}>
                        {countryCode.code}
                      </Text>
                      <Text style={{ color: colors.muted }}>▼</Text>
                    </AnimatedPressable>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="5XXXXXXXX"
                      placeholderTextColor={colors.muted}
                      keyboardType="phone-pad"
                      style={[
                        styles.phoneInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.foreground,
                        },
                      ]}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                البريد الإلكتروني <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  styles.inputLtr,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                كلمة المرور <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[
                  styles.input,
                  styles.inputLtr,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  تأكيد كلمة المرور <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={[
                    styles.input,
                    styles.inputLtr,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
              </View>
            )}

            {mode === "login" && (
              <AnimatedPressable
                onPress={handleForgotPassword}
                style={styles.forgotPassword}
              >
                <Text style={{ color: "#8B1538", fontSize: 14 }}>
                  نسيت كلمة المرور؟
                </Text>
              </AnimatedPressable>
            )}

            {/* Submit Button */}
            <AnimatedPressable
              onPress={mode === "login" ? handleLogin : handleRegister}
              disabled={isLoading}
              style={[styles.submitButton, { backgroundColor: "#8B1538" }]}
            >
              <Text style={styles.submitButtonText}>
                {isLoading
                  ? "جاري التحميل..."
                  : mode === "login"
                  ? "تسجيل الدخول"
                  : "إنشاء الحساب"}
              </Text>
            </AnimatedPressable>

            {/* Toggle Mode */}
            <View style={styles.toggleMode}>
              <Text style={{ color: colors.muted }}>
                {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
              </Text>
              <AnimatedPressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
                <Text style={{ color: "#8B1538", fontWeight: "bold", marginRight: 4 }}>
                  {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
                </Text>
              </AnimatedPressable>
            </View>

            {/* Guest Continue */}
            <AnimatedPressable onPress={handleGuestContinue} style={styles.guestButton}>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                المتابعة كضيف (5 أسئلة مجانية)
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                اختر كود الدولة
              </Text>
              <AnimatedPressable onPress={() => setShowCountryPicker(false)}>
                <Text style={{ fontSize: 24, color: colors.muted }}>×</Text>
              </AnimatedPressable>
            </View>
            <FlatList
              data={countryCodes}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <AnimatedPressable
                  onPress={() => {
                    setCountryCode(item);
                    setShowCountryPicker(false);
                  }}
                  style={{
                    ...styles.countryItem,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: colors.foreground }]}>
                    {item.country}
                  </Text>
                  <Text style={[styles.countryCodeItem, { color: colors.muted }]}>
                    {item.code}
                  </Text>
                </AnimatedPressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    textAlign: "center",
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    textAlign: "right",
  },
  inputLtr: {
    textAlign: "left",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 110,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    textAlign: "left",
  },
  forgotPassword: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  submitButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleMode: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestButton: {
    alignItems: "center",
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
  },
  countryCodeItem: {
    fontSize: 16,
  },
});
