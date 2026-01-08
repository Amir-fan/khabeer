import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth-new";
import { AnimatedPressable } from "@/components/animated-pressable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "register";

const GUEST_MODE_KEY = "khabeer_guest_mode";
const GUEST_ATTEMPTS_KEY = "khabeer_guest_attempts";
const GUEST_ATTEMPTS_DATE_KEY = "khabeer_guest_attempts_date";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveAuth } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const showError = (message: string) => {
    setErrorMessage(message);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async () => {
    setErrorMessage("");
    
    if (!email || !password) {
      showError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    if (!validateEmail(email)) {
      showError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    try {
      // Clear guest mode
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const result = await loginMutation.mutateAsync({ email, password });
      
      if (result.success && result.token && result.user) {
        console.log("[Auth] Login successful:", result.user.email);
        await saveAuth(result.token, result.user);
        router.replace("/(tabs)");
      } else {
        showError("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى");
      }
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      const message = error?.message || "عذراً، فشل تسجيل الدخول. يرجى التحقق من البيانات";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage("");
    
    if (!email || !password || !confirmPassword) {
      showError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (!validateEmail(email)) {
      showError("يرجى إدخال بريد إلكتروني صحيح");
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
      // Clear guest mode
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_KEY);
      await AsyncStorage.removeItem(GUEST_ATTEMPTS_DATE_KEY);
      
      const result = await registerMutation.mutateAsync({ email, password });
      
      if (result.success) {
        console.log("[Auth] Registration successful");
        // Auto-login after registration
        await handleLogin();
      } else {
        showError("فشل إنشاء الحساب. يرجى المحاولة مرة أخرى");
      }
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      const message = error?.message || "عذراً، فشل إنشاء الحساب";
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
      await AsyncStorage.setItem(GUEST_ATTEMPTS_KEY, "0");
      await AsyncStorage.setItem(GUEST_ATTEMPTS_DATE_KEY, new Date().toISOString());
      router.replace("/(tabs)");
    } catch (error) {
      console.error("[Auth] Guest mode error:", error);
      showError("فشل الدخول كضيف");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          style={styles.logoContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoText}>خبير</Text>
        </LinearGradient>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {mode === "login"
            ? "ادخل بياناتك للمتابعة"
            : "أنشئ حسابك للاستمتاع بجميع المميزات"}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>البريد الإلكتروني</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>كلمة المرور</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              textContentType={mode === "login" ? "password" : "newPassword"}
            />
          </View>

          {mode === "register" && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.foreground }]}>تأكيد كلمة المرور</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                textContentType="newPassword"
              />
            </View>
          )}

          {errorMessage ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + "15" }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <AnimatedPressable
            onPress={mode === "login" ? handleLogin : handleRegister}
            disabled={isLoading}
            style={[styles.button, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "جاري التحميل..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
            <Text style={[styles.switchText, { color: colors.muted }]}>
              {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}
              </Text>
            </Text>
          </AnimatedPressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>أو</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <AnimatedPressable
            onPress={handleGuestLogin}
            style={[styles.guestButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.guestButtonText, { color: colors.foreground }]}>
              الدخول كضيف
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 36,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  switchText: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  guestButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

