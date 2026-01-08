import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Alert,
  Modal,
  StyleSheet,
  Keyboard,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Svg, { Path, Circle, Rect, G, Defs, ClipPath } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Storage keys
const GUEST_MODE_KEY = "khabeer_guest_mode";
const GUEST_ATTEMPTS_KEY = "khabeer_guest_attempts";
const GUEST_ATTEMPTS_DATE_KEY = "khabeer_guest_attempts_date";
const USER_ATTEMPTS_KEY = "khabeer_user_attempts";
const USER_ATTEMPTS_DATE_KEY = "khabeer_user_attempts_date";

// Default daily limit (can be configured from admin)
const DEFAULT_DAILY_LIMIT = 5;

// Modern SVG Icons
const Icons = {
  // Beautiful News Icon - Newspaper with gradient effect
  news: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" 
        stroke={color} 
        strokeWidth={1.5} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <Path d="M7 7H12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 11H17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 15H17" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x="14" y="6" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.2} />
    </Svg>
  ),
  profile: (color = "#687076") => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  chart: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3v18h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 14l4-4 3 3 6-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={20} cy={7} r={2} stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  document: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M8 13h8M8 17h5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  library: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7h8M8 11h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  consultant: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.5} />
      <Path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16 3a4 4 0 010 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M20 15a4 4 0 010 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  send: (color = "#fff") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  sparkle: (color = "#8B1538") => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  lightning: (color = "#D4A574") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  bank: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  coins: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={9} r={6} stroke={color} strokeWidth={1.5} />
      <Path d="M15 9a6 6 0 106 6" stroke={color} strokeWidth={1.5} />
      <Path d="M9 6v6l3 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  building: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  // Upload/Attach file icon
  attach: (color = "#687076") => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  // Search icon
  search: (color = "#687076") => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={1.5} />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  // History/Clock icon
  history: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  // Share icon
  share: (color = "#687076") => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={1.5} />
      <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={1.5} />
      <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={1.5} />
      <Path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  // Trash/Delete icon
  trash: (color = "#687076") => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 11v6M14 11v6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  // Menu/Hamburger icon
  menu: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12h18M3 6h18M3 18h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  // Close/X icon
  close: (color = "#687076") => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

// Animated Icon Wrapper
function AnimatedIconWrapper({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </AnimatedPressable>
  );
}

// Animated Typing Placeholder Component
function AnimatedPlaceholder() {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  
  const placeholders = [
    "اسأل عن حكم الاستثمار في الأسهم...",
    "استفسر عن شروط المرابحة...",
    "اسأل عن حساب الزكاة...",
    "استفسر عن التمويل الإسلامي...",
    "اسأل عن العقود الشرعية...",
  ];

  useEffect(() => {
    const currentPlaceholder = placeholders[currentIndex];
    let charIndex = 0;
    let typingInterval: ReturnType<typeof setTimeout>;
    let pauseTimeout: ReturnType<typeof setTimeout>;

    if (isTyping) {
      typingInterval = setInterval(() => {
        if (charIndex <= currentPlaceholder.length) {
          setDisplayText(currentPlaceholder.substring(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typingInterval);
          pauseTimeout = setTimeout(() => {
            setIsTyping(false);
          }, 2000);
        }
      }, 80);
    } else {
      // Erasing
      let eraseIndex = displayText.length;
      typingInterval = setInterval(() => {
        if (eraseIndex >= 0) {
          setDisplayText(currentPlaceholder.substring(0, eraseIndex));
          eraseIndex--;
        } else {
          clearInterval(typingInterval);
          setCurrentIndex((prev) => (prev + 1) % placeholders.length);
          setIsTyping(true);
        }
      }, 40);
    }

    return () => {
      clearInterval(typingInterval);
      clearTimeout(pauseTimeout);
    };
  }, [currentIndex, isTyping]);

  return displayText || "اكتب سؤالك هنا...";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(DEFAULT_DAILY_LIMIT);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showNewsPanel, setShowNewsPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{id: string; title: string; date: string; messages: {role: string; content: string}[]}[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [placeholder, setPlaceholder] = useState("اكتب سؤالك هنا...");
  const INPUT_BAR_HEIGHT = 84;

  const chatMutation = trpc.ai.chat.useMutation();
  
  // Get usage stats for UI display (only for authenticated users)
  const { data: usageStats, refetch: refetchUsageStats } = trpc.auth.usageStats.useQuery(
    undefined,
    { enabled: isAuthenticated && !isGuestMode }
  );
  
  // Use backend stats if available, otherwise fall back to local state for guests
  const effectiveRemainingAttempts = usageStats?.ai.remaining ?? (isGuestMode ? remainingAttempts : null);

  // Animated placeholder effect
  useEffect(() => {
    const placeholders = [
      "اسأل عن حكم الاستثمار في الأسهم...",
      "استفسر عن شروط المرابحة...",
      "اسأل عن حساب الزكاة...",
      "استفسر عن التمويل الإسلامي...",
      "اسأل عن العقود الشرعية...",
    ];
    
    let currentIndex = 0;
    let charIndex = 0;
    let isTyping = true;
    let currentText = "";
    
    const animate = () => {
      const currentPlaceholder = placeholders[currentIndex];
      
      if (isTyping) {
        if (charIndex <= currentPlaceholder.length) {
          currentText = currentPlaceholder.substring(0, charIndex);
          setPlaceholder(currentText || "اكتب سؤالك هنا...");
          charIndex++;
        } else {
          isTyping = false;
          setTimeout(animate, 2000); // Pause before erasing
          return;
        }
      } else {
        if (charIndex > 0) {
          charIndex--;
          currentText = currentPlaceholder.substring(0, charIndex);
          setPlaceholder(currentText || "اكتب سؤالك هنا...");
        } else {
          isTyping = true;
          currentIndex = (currentIndex + 1) % placeholders.length;
        }
      }
      
      setTimeout(animate, isTyping ? 80 : 40);
    };
    
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(animate, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Check and reset daily attempts
  const checkDailyAttempts = useCallback(async () => {
    const today = new Date().toDateString();
    // Only check guest mode if user is not authenticated
    // Guest mode should only be set explicitly from auth screen
    const isGuest = !isAuthenticated ? await AsyncStorage.getItem(GUEST_MODE_KEY) : null;
    setIsGuestMode(isGuest === "true");

    const dateKey = isGuest === "true" ? GUEST_ATTEMPTS_DATE_KEY : USER_ATTEMPTS_DATE_KEY;
    const attemptsKey = isGuest === "true" ? GUEST_ATTEMPTS_KEY : USER_ATTEMPTS_KEY;

    const storedDate = await AsyncStorage.getItem(dateKey);
    
    if (storedDate !== today) {
      await AsyncStorage.setItem(dateKey, today);
      await AsyncStorage.setItem(attemptsKey, String(DEFAULT_DAILY_LIMIT));
      setRemainingAttempts(DEFAULT_DAILY_LIMIT);
    } else {
      const attempts = await AsyncStorage.getItem(attemptsKey);
      setRemainingAttempts(attempts ? parseInt(attempts) : DEFAULT_DAILY_LIMIT);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkDailyAttempts();
  }, [checkDailyAttempts]);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      if (!loading) {
        const isGuest = await AsyncStorage.getItem(GUEST_MODE_KEY);
        
        // If user is not authenticated and not in guest mode, redirect to auth
        // Guest mode must be explicitly set from auth screen
        if (!isAuthenticated && isGuest !== "true") {
          if (Platform.OS === "web") {
            router.replace("/auth");
          } else {
            router.replace("/onboarding");
          }
        }
      }
    };
    checkFirstLaunch();
  }, [loading, isAuthenticated]);

  const quickActions = [
    { id: "stock", icon: Icons.chart, title: "فحص سهم", subtitle: "التوافق الشرعي" },
    { id: "company-test", icon: Icons.building, title: "اختبر شركتك", subtitle: "التوافق الشرعي" },
    { id: "library", icon: Icons.library, title: "المكتبة", subtitle: "الملفات والمراجع" },
  ];

  const decrementAttempts = async () => {
    const attemptsKey = isGuestMode ? GUEST_ATTEMPTS_KEY : USER_ATTEMPTS_KEY;
    const newAttempts = remainingAttempts - 1;
    await AsyncStorage.setItem(attemptsKey, String(newAttempts));
    setRemainingAttempts(newAttempts);
    return newAttempts;
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    // Check limit from backend if authenticated, otherwise use local state for guests
    const isLimitReached = isAuthenticated && !isGuestMode
      ? usageStats?.ai.allowed === false
      : remainingAttempts <= 0;
    
    if (isLimitReached) {
      setShowUpgradeModal(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({ message: userMessage });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      
      // Update usage stats after successful message (for authenticated users)
      if (isAuthenticated && !isGuestMode) {
        await refetchUsageStats();
      } else {
        // For guests, decrement local counter
        await decrementAttempts();
      }
    } catch (error: any) {
      // Check if error is due to limit reached
      const isLimitError = error?.data?.code === "FORBIDDEN" || error?.message?.includes("الحد");
      
      if (isLimitError) {
        // Refetch usage stats to show updated (zero) remaining count
        if (isAuthenticated && !isGuestMode) {
          await refetchUsageStats();
        }
        setShowUpgradeModal(true);
      }
      
      const errorMessage = error?.message || "عذراً، حدث خطأ غير متوقع";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${errorMessage}\n\n${isLimitError ? "يرجى الترقية للاستمرار." : "يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني."}` },
      ]);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    switch (id) {
      case "stock":
        router.push("/stock");
        break;
      case "company-test":
        router.push("/company-test");
        break;
      case "library":
        router.push("/library");
        break;
      case "contract":
        router.push("/contract");
        break;
    }
  };

  const handleRequestConsultant = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowConsultantModal(true);
  };

  const submitConsultantRequest = async () => {
    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert(
      "✅ تم إرسال الطلب بنجاح",
      "شكراً لتواصلك معنا!\n\nسيتم التواصل معك من قبل مستشار شرعي متخصص خلال 24 ساعة عبر:\n• البريد الإلكتروني\n• الهاتف المسجل\n\nيمكنك متابعة حالة طلبك من قسم الإشعارات.",
      [{ text: "حسناً", onPress: () => setShowConsultantModal(false) }]
    );
  };

  const handleAttachFile = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert(
      "رفع ملف أو تحليل عقد",
      "اختر نوع العملية",
      [
        { 
          text: "تحليل عقد شرعي", 
          onPress: () => router.push("/contract"),
        },
        { 
          text: "رفع صورة", 
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                const fileName = result.assets[0].uri.split('/').pop() || 'image.jpg';
                setMessage(`[تم إرفاق صورة: ${fileName}]`);
                Alert.alert("تم", "تم إرفاق الصورة بنجاح. يمكنك إرسال رسالتك الآن.");
              }
            } catch (error) {
              Alert.alert("خطأ", "فشل في رفع الصورة");
            }
          }
        },
        { 
          text: "رفع مستند PDF", 
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf"],
                copyToCacheDirectory: true,
              });
              if (!result.canceled && result.assets[0]) {
                setMessage(`[تم إرفاق مستند: ${result.assets[0].name}]`);
                Alert.alert("تم", "تم إرفاق المستند بنجاح. يمكنك إرسال رسالتك الآن.");
              }
            } catch (error) {
              Alert.alert("خطأ", "فشل في رفع المستند");
            }
          }
        },
        { text: "إلغاء", style: "cancel" },
      ]
    );
  };

  const saveConversation = async () => {
    if (messages.length === 0) return;
    const newConversation = {
      id: Date.now().toString(),
      title: messages[0]?.content.substring(0, 50) || "محادثة جديدة",
      date: new Date().toLocaleDateString("ar-SA"),
      messages: [...messages],
    };
    const updatedHistory = [newConversation, ...conversationHistory];
    setConversationHistory(updatedHistory);
    await AsyncStorage.setItem("khabeer_conversations", JSON.stringify(updatedHistory));
  };

  const loadConversationHistory = async () => {
    const saved = await AsyncStorage.getItem("khabeer_conversations");
    if (saved) {
      setConversationHistory(JSON.parse(saved));
    }
  };

  const deleteConversation = async (id: string) => {
    const updated = conversationHistory.filter(c => c.id !== id);
    setConversationHistory(updated);
    await AsyncStorage.setItem("khabeer_conversations", JSON.stringify(updated));
  };

  const shareConversation = (conversation: typeof conversationHistory[0]) => {
    const text = conversation.messages.map(m => `${m.role === "user" ? "أنت" : "خبير"}: ${m.content}`).join("\n\n");
    Alert.alert("مشاركة", text.substring(0, 200) + "...");
  };

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, []);

  // Swipe gesture handlers
  const openHistoryPanel = () => {
    setShowHistoryPanel(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const openNewsPanel = () => {
    setShowNewsPanel(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX > 100) {
        // Swipe right - show history
        runOnJS(openHistoryPanel)();
      } else if (event.translationX < -100) {
        // Swipe left - show news
        runOnJS(openNewsPanel)();
      }
    });

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <View style={styles.loadingContainer}>
          {Icons.sparkle("#8B1538")}
          <Text className="text-foreground mt-4">جاري التحميل...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
    {/* We handle bottom inset ourselves to avoid KeyboardAvoidingView + SafeArea bottom fighting each other */}
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
      >
        {/* Tap anywhere to dismiss keyboard */}
        <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
        {/* Header */}
        <View style={styles.header}>
          {/* Left Icons - News & Search */}
          <View style={styles.headerLeftIcons}>
            <AnimatedIconWrapper onPress={() => router.push("/news")}>
              <LinearGradient
                colors={["#FEF7ED", "#FDF2E9"]}
                style={styles.headerIconGradient}
              >
                {Icons.news("#D4A574")}
              </LinearGradient>
            </AnimatedIconWrapper>
            <AnimatedIconWrapper onPress={() => setShowSearchModal(true)}>
              <View style={styles.headerIcon}>
                {Icons.search("#687076")}
              </View>
            </AnimatedIconWrapper>
          </View>

          {/* Logo - Center */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={["#8B1538", "#C9375D"]}
              style={styles.logo}
            >
              <Text style={styles.logoText}>خ</Text>
            </LinearGradient>
          </View>

          {/* Profile Icon - Right */}
          <AnimatedIconWrapper onPress={() => router.push("/profile")}>
            <View style={styles.headerIcon}>
              {Icons.profile("#687076")}
            </View>
          </AnimatedIconWrapper>
        </View>

        {/* Remaining Attempts Banner */}
        {(isGuestMode || (user?.role !== "pro" && user?.role !== "admin")) && (
          <View style={styles.attemptsBanner}>
            <View style={styles.attemptsContent}>
              <Text style={styles.attemptsText}>
                {effectiveRemainingAttempts !== null ? (
                  <>
                    باقي لك <Text style={styles.attemptsNumber}>{effectiveRemainingAttempts}</Text> سؤال اليوم
                  </>
                ) : (
                  "رسائل غير محدودة"
                )}
              </Text>
              <AnimatedPressable onPress={() => router.push("/packages")}>
                <LinearGradient
                  colors={["#8B1538", "#C9375D"]}
                  style={styles.upgradeButton}
                >
                  <Text style={styles.upgradeButtonText}>ترقية</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // Make sure the last message is always above the input bar + safe area
              paddingBottom: INPUT_BAR_HEIGHT + Math.max(insets.bottom, 12),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Quick Actions - Always visible with toggle */}
          {showQuickActions && (
            <View style={styles.quickActionsSection}>
              {messages.length === 0 && (
                <View style={styles.welcomeSection}>
                  <Text style={styles.welcomeTitle}>مرحباً بك في خبير</Text>
                  <Text style={styles.welcomeSubtitle}>مستشارك الشرعي للتمويل الإسلامي</Text>
                </View>
              )}

              {/* Request Human Consultant - Prominent Position */}
              <AnimatedPressable 
                onPress={handleRequestConsultant} 
                style={styles.companyTestButton}
              >
                <LinearGradient
                  colors={["#8B1538", "#A91D4A"]}
                  style={styles.companyTestGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.companyTestIconContainer}>
                    {Icons.consultant("#fff")}
                  </View>
                  <View style={styles.companyTestContent}>
                    <Text style={styles.companyTestTitle}>طلب مستشار بشري</Text>
                    <Text style={styles.companyTestSubtitle}>تحدث مع مستشار شرعي متخصص</Text>
                  </View>
                  <View style={styles.companyTestArrow}>
                    <Text style={styles.companyTestArrowText}>←</Text>
                  </View>
                </LinearGradient>
              </AnimatedPressable>

              {/* Quick Action Cards - Medium Size */}
              <View style={styles.quickActionsRow}>
                {quickActions.map((action) => (
                  <AnimatedIconWrapper key={action.id} onPress={() => handleQuickAction(action.id)}>
                    <View style={styles.quickActionCard}>
                      <View style={styles.quickActionIconContainer}>
                        {action.icon("#8B1538")}
                      </View>
                      <Text style={styles.quickActionTitle}>{action.title}</Text>
                      <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
                    </View>
                  </AnimatedIconWrapper>
                ))}
              </View>


            </View>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <View style={styles.messagesContainer}>
              {/* Toggle Quick Actions Button */}
              <AnimatedPressable
                onPress={() => setShowQuickActions(!showQuickActions)}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {showQuickActions ? "إخفاء الاختصارات ▲" : "عرض الاختصارات ▼"}
                </Text>
              </AnimatedPressable>

              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageWrapper,
                    msg.role === "user" ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      msg.role === "user" ? styles.userMessage : styles.assistantMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.role === "user" ? styles.userMessageText : styles.assistantMessageText,
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}
              {isLoading && (
                <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
                  <View style={[styles.messageBubble, styles.assistantMessage]}>
                    <View style={styles.typingIndicator}>
                      <View style={[styles.typingDot, styles.typingDot1]} />
                      <View style={[styles.typingDot, styles.typingDot2]} />
                      <View style={[styles.typingDot, styles.typingDot3]} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Chat Input */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            {/* Request Consultant Button */}
            <AnimatedIconWrapper onPress={handleRequestConsultant}>
              <View style={styles.consultantButton}>
                {Icons.consultant("#D4A574")}
              </View>
            </AnimatedIconWrapper>
            
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder}
              placeholderTextColor="#9BA1A6"
              style={styles.textInput}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            
            {/* Attach File Button */}
            <AnimatedIconWrapper onPress={handleAttachFile}>
              <View style={styles.attachButton}>
                {Icons.attach("#8B1538")}
              </View>
            </AnimatedIconWrapper>
            
            {/* Send Button - Maroon Color */}
            <AnimatedPressable
              onPress={handleSend}
              disabled={!message.trim() || isLoading}
            >
              <LinearGradient
                colors={message.trim() && !isLoading ? ["#8B1538", "#C9375D"] : ["#9BA1A6", "#9BA1A6"]}
                style={styles.sendButton}
              >
                {Icons.send("#fff")}
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              {Icons.lightning("#D4A574")}
            </View>
            <Text style={styles.modalTitle}>انتهت محاولاتك اليومية</Text>
            <Text style={styles.modalSubtitle}>
              ترقّ إلى الباقة الاحترافية للحصول على محادثات غير محدودة
            </Text>
            
            <AnimatedPressable
              onPress={() => {
                setShowUpgradeModal(false);
                router.push("/packages");
              }}
              style={styles.modalUpgradeButton}
            >
              <LinearGradient
                colors={["#8B1538", "#C9375D"]}
                style={styles.modalUpgradeGradient}
              >
                <Text style={styles.modalUpgradeText}>ترقية الآن</Text>
              </LinearGradient>
            </AnimatedPressable>
            
            <AnimatedPressable
              onPress={() => setShowUpgradeModal(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>عودة غداً</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Consultant Request Modal */}
      <Modal
        visible={showConsultantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsultantModal(false)}
      >
        <View style={styles.consultantModalOverlay}>
          <View style={styles.consultantModalContent}>
            <View style={styles.modalHandle} />
            
            <Text style={styles.consultantModalTitle}>طلب مستشار</Text>
            <Text style={styles.consultantModalSubtitle}>
              سيتم تحويلك إلى مستشار شرعي متخصص حسب طبيعة استفسارك
            </Text>
            
            <View style={styles.consultantOptions}>
              {[
                { icon: Icons.chart, title: "استثمارات وأسهم", desc: "فحص الأسهم والصناديق" },
                { icon: Icons.bank, title: "تمويل ومصارف", desc: "قروض ومرابحات" },
                { icon: Icons.document, title: "عقود ومعاملات", desc: "مراجعة العقود" },
                { icon: Icons.coins, title: "زكاة وتطهير", desc: "حساب الزكاة" },
              ].map((item, index) => (
                <AnimatedPressable
                  key={index}
                  onPress={submitConsultantRequest}
                  style={styles.consultantOption}
                >
                  <View style={styles.consultantOptionIcon}>
                    {item.icon("#8B1538")}
                  </View>
                  <View style={styles.consultantOptionContent}>
                    <Text style={styles.consultantOptionTitle}>{item.title}</Text>
                    <Text style={styles.consultantOptionDesc}>{item.desc}</Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
            
            <AnimatedPressable
              onPress={() => setShowConsultantModal(false)}
              style={styles.consultantCancelButton}
            >
              <Text style={styles.consultantCancelText}>إلغاء</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.searchModalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>بحث في المحادثات</Text>
              <AnimatedPressable onPress={() => setShowSearchModal(false)}>
                <View style={styles.closeButton}>
                  {Icons.close("#687076")}
                </View>
              </AnimatedPressable>
            </View>
            
            <View style={styles.searchInputContainer}>
              {Icons.search("#9BA1A6")}
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="ابحث عن محادثة..."
                placeholderTextColor="#9BA1A6"
                style={styles.searchInput}
              />
            </View>
            
            <ScrollView style={styles.searchResults}>
              {conversationHistory
                .filter(c => c.title.includes(searchQuery) || c.messages.some(m => m.content.includes(searchQuery)))
                .map((conv) => (
                  <AnimatedPressable
                    key={conv.id}
                    onPress={() => {
                      setMessages(conv.messages);
                      setShowSearchModal(false);
                    }}
                    style={styles.searchResultItem}
                  >
                    <View style={styles.searchResultIcon}>
                      {Icons.history("#8B1538")}
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle}>{conv.title}</Text>
                      <Text style={styles.searchResultDate}>{conv.date}</Text>
                    </View>
                  </AnimatedPressable>
                ))}
              {conversationHistory.length === 0 && (
                <Text style={styles.noResultsText}>لا توجد محادثات سابقة</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* History Panel (Slide from Right) */}
      <Modal
        visible={showHistoryPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryPanel(false)}
      >
        <View style={styles.historyPanelOverlay}>
          <AnimatedPressable 
            style={styles.historyPanelBackdrop} 
            onPress={() => setShowHistoryPanel(false)}
          />
          <View style={styles.historyPanel}>
            <View style={styles.historyPanelHeader}>
              <Text style={styles.historyPanelTitle}>سجل المحادثات</Text>
              <AnimatedPressable onPress={() => setShowHistoryPanel(false)}>
                {Icons.close("#687076")}
              </AnimatedPressable>
            </View>
            
            <AnimatedPressable
              onPress={() => {
                setMessages([]);
                saveConversation();
                setShowHistoryPanel(false);
              }}
              style={styles.newChatButton}
            >
              <LinearGradient
                colors={["#8B1538", "#C9375D"]}
                style={styles.newChatGradient}
              >
                <Text style={styles.newChatText}>محادثة جديدة</Text>
              </LinearGradient>
            </AnimatedPressable>
            
            <ScrollView style={styles.historyList}>
              {conversationHistory.map((conv) => (
                <View key={conv.id} style={styles.historyItem}>
                  <AnimatedPressable
                    onPress={() => {
                      setMessages(conv.messages);
                      setShowHistoryPanel(false);
                    }}
                    style={styles.historyItemContent}
                  >
                    <View style={styles.historyItemIcon}>
                      {Icons.history("#8B1538")}
                    </View>
                    <View style={styles.historyItemText}>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>{conv.title}</Text>
                      <Text style={styles.historyItemDate}>{conv.date}</Text>
                    </View>
                  </AnimatedPressable>
                  <View style={styles.historyItemActions}>
                    <AnimatedPressable onPress={() => shareConversation(conv)}>
                      <View style={styles.historyActionButton}>
                        {Icons.share("#6B7280")}
                      </View>
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => deleteConversation(conv.id)}>
                      <View style={styles.historyActionButton}>
                        {Icons.trash("#EF4444")}
                      </View>
                    </AnimatedPressable>
                  </View>
                </View>
              ))}
              {conversationHistory.length === 0 && (
                <View style={styles.emptyHistory}>
                  {Icons.history("#D1D5DB")}
                  <Text style={styles.emptyHistoryText}>لا توجد محادثات سابقة</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* News Panel (Slide from Left) */}
      <Modal
        visible={showNewsPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewsPanel(false)}
      >
        <View style={styles.newsPanelOverlay}>
          <View style={styles.newsPanel}>
            <View style={styles.newsPanelHeader}>
              <AnimatedPressable onPress={() => setShowNewsPanel(false)}>
                {Icons.close("#687076")}
              </AnimatedPressable>
              <Text style={styles.newsPanelTitle}>آخر الأخبار</Text>
            </View>
            
            <ScrollView style={styles.newsList}>
              <AnimatedPressable
                onPress={() => {
                  setShowNewsPanel(false);
                  router.push("/news");
                }}
                style={styles.viewAllNews}
              >
                <Text style={styles.viewAllNewsText}>عرض جميع الأخبار ←</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
          <AnimatedPressable 
            style={styles.newsPanelBackdrop} 
            onPress={() => setShowNewsPanel(false)}
          />
        </View>
      </Modal>
    </ScreenContainer>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeftIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F4F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F5E6D3",
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  attemptsBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#F8F4F0",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  attemptsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attemptsText: {
    fontSize: 14,
    color: "#374151",
  },
  attemptsNumber: {
    fontWeight: "bold",
    color: "#8B1538",
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  quickActionsSection: {
    paddingTop: 8,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  companyTestButton: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#8B1538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  companyTestGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
  },
  companyTestIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },
  companyTestContent: {
    flex: 1,
  },
  companyTestTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "right",
  },
  companyTestSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "right",
  },
  companyTestArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  companyTestArrowText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  quickActionCard: {
    width: 110,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
  },
  consultantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF7ED",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F5E6D3",
    marginBottom: 16,
  },
  consultantIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FDF2E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  consultantContent: {
    flex: 1,
  },
  consultantTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  consultantSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  consultantArrow: {
    fontSize: 18,
    color: "#D4A574",
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  toggleButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 16,
  },
  toggleButtonText: {
    fontSize: 12,
    color: "#6B7280",
  },
  messageWrapper: {
    marginBottom: 12,
    maxWidth: "85%",
  },
  userMessageWrapper: {
    alignSelf: "flex-start",
  },
  assistantMessageWrapper: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: "#8B1538",
    borderTopRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  assistantMessageText: {
    color: "#1F2937",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  consultantButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#1F2937",
    textAlign: "right",
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F4F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalUpgradeButton: {
    width: "100%",
    marginBottom: 12,
  },
  modalUpgradeGradient: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  modalUpgradeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCancelButton: {
    paddingVertical: 12,
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 14,
  },
  consultantModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  consultantModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  consultantModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  consultantModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  consultantOptions: {
    gap: 12,
    marginBottom: 20,
  },
  consultantOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  consultantOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  consultantOptionContent: {
    flex: 1,
  },
  consultantOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  consultantOptionDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  consultantCancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  consultantCancelText: {
    color: "#6B7280",
    fontSize: 15,
  },
  // Search Modal Styles
  searchModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  searchModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    textAlign: "right",
  },
  searchResults: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
    textAlign: "right",
  },
  searchResultDate: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
  },
  noResultsText: {
    textAlign: "center",
    color: "#6B7280",
    paddingVertical: 40,
  },
  // History Panel Styles
  historyPanelOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  historyPanelBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  historyPanel: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  historyPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  historyPanelTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  newChatButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  newChatGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
  },
  newChatText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  historyItemText: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
    textAlign: "right",
  },
  historyItemDate: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
  },
  historyItemActions: {
    flexDirection: "row",
    gap: 8,
  },
  historyActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyHistoryText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  // News Panel Styles
  newsPanelOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  newsPanel: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  newsPanelBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  newsPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  newsPanelTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  newsList: {
    flex: 1,
  },
  viewAllNews: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FEF7ED",
    borderRadius: 16,
  },
  viewAllNewsText: {
    color: "#8B1538",
    fontSize: 15,
    fontWeight: "600",
  },
});
