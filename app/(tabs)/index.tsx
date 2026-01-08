import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/hooks/use-auth";

// Helper to add opacity to hex colors
const addOpacity = (hex: string, opacity: number): string => {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, "0");
  return `${hex}${alpha}`;
};

const WELCOME_MESSAGE =
  "السلام عليكم ورحمة الله وبركاته.\n\nأنا مساعدك الشرعي في خبير. اسألني عن الأسهم، العقود، أو أي استفسار مالي شرعي.\n\nكيف أقدر أساعدك اليوم؟";

interface SuggestionCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  action: () => void;
}

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string; sources?: any[] }[]
  >([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // AI chat mutation (for getting response)
  const chatMutation = trpc.ai.chat.useMutation();

  // Get usage stats for UI display
  const { data: usageStats, refetch: refetchUsageStats } = trpc.auth.usageStats.useQuery(
    undefined,
    { enabled: !!user } // Only fetch if user is authenticated
  );

  const isLoading = chatMutation.isPending;

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const suggestionCards: SuggestionCard[] = [
    {
      id: "1",
      icon: "chart.line.uptrend.xyaxis",
      title: "فحص سهم",
      subtitle: "التوافق الشرعي",
      action: () => router.push("/stock" as any),
    },
    {
      id: "2",
      icon: "doc.text.magnifyingglass",
      title: "تحليل عقد",
      subtitle: "مراجعة شرعية",
      action: () => router.push("/contract" as any),
    },
    {
      id: "3",
      icon: "newspaper.fill",
      title: "الأخبار",
      subtitle: "أخبار مالية",
      action: () => router.push("/(tabs)/news" as any),
    },
    {
      id: "4",
      icon: "folder.fill",
      title: "المكتبة",
      subtitle: "ملفات المستشار/الأدمن",
      action: () => router.push("/library" as any),
    },
  ];

  const quickPrompts = [
    "ما حكم الاستثمار في الأسهم؟",
    "هل التأمين التجاري حلال؟",
    "ما هي شروط المرابحة؟",
    "كيف أحسب الزكاة على الأسهم؟",
  ];

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) return;
      
      const file = result.assets[0];
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Show analysis prompt
      Alert.alert(
        "تحليل الملف",
        `هل تريد تحليل الملف "${file.name}" شرعياً؟`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "تحليل",
            onPress: () => {
              setInputText(`حلل هذا الملف شرعياً: ${file.name}`);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء اختيار الملف");
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const messageContent = inputText.trim();
    setInputText("");
    Keyboard.dismiss();

    try {
      // Optimistic append user message locally
      const userMsgId = `u_${Date.now()}`;
      setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: messageContent }]);

      // AI response (supports guests; persists only for authenticated users)
      const response = await chatMutation.mutateAsync({
        message: messageContent,
        context: "general",
        conversationId,
      });

      if (response.conversationId) setConversationId(response.conversationId);

      const assistantMsgId = `a_${Date.now() + 1}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: response.reply || "عذراً، لم أتمكن من إجابة سؤالك.",
          sources: response.sources,
        },
      ]);
      
      // Refetch usage stats to update remaining count
      if (isAuthenticated) {
        await refetchUsageStats();
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Check if error is due to limit reached
      const isLimitError = error?.data?.code === "FORBIDDEN" || error?.message?.includes("الحد");
      
      if (isLimitError) {
        // Refetch usage stats to show updated (zero) remaining count (if authed)
        if (isAuthenticated) await refetchUsageStats();

        Alert.alert(
          "تم بلوغ الحد المسموح",
          error?.message || "تم بلوغ الحد المسموح للدردشة في الخطة الحالية. يرجى الترقية للاستمرار.",
          [
            { text: "إلغاء", style: "cancel" },
            {
              text: "ترقية",
              onPress: () => router.push("/packages" as any),
            },
            {
              text: "تسجيل الدخول",
              onPress: () => router.push("/auth" as any),
            },
          ]
        );
      } else {
        Alert.alert("خطأ", error?.message || "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  const handleNewChat = () => {
    setConversationId(undefined);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
      },
    ]);
    setInputText("");
    Keyboard.dismiss();
    // On "new chat", bring user directly to typing
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isUser = item.role === "user";

    // Split disclaimer from assistant messages so we can render it as a small note
    let mainText = item.content as string;
    let disclaimerText: string | null = null;
    if (!isUser && typeof item.content === "string") {
      const marker = "⚠️ تنبيه مهم:";
      const idx = item.content.indexOf(marker);
      if (idx !== -1) {
        mainText = item.content.slice(0, idx).trimEnd();
        disclaimerText = item.content.slice(idx).trim();
      }
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
            <IconSymbol name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {mainText}
          </Text>
          {!!disclaimerText && (
            <Text style={[styles.disclaimerText, { color: colors.muted }]}>
              {disclaimerText}
            </Text>
          )}
          {item.sources && typeof item.sources === 'object' && Array.isArray(item.sources) && item.sources.length > 0 && (
            <View style={[styles.sourcesContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.sourcesLabel, { color: colors.muted }]}>
                المصادر:
              </Text>
              {item.sources.map((source: any, index: number) => (
                <Text
                  key={index}
                  style={[styles.sourceLink, { color: colors.primary }]}
                >
                  {source.title || source}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    // Get remaining messages from backend (null = unlimited)
    const messagesLeft = usageStats?.ai.remaining ?? null;
    const isLimitReached = usageStats?.ai.allowed === false;
    
    return (
      <View style={styles.emptyState}>
        {/* Hero */}
        <View style={[styles.heroCard, { borderColor: addOpacity(colors.primary, 0.12), backgroundColor: addOpacity(colors.primary, 0.08) }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBadge, { backgroundColor: addOpacity(colors.primary, 0.18) }]}>
              <IconSymbol name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>مساعد شرعي</Text>
            </View>
            {messagesLeft !== null && (
              <View style={[styles.heroPill, { backgroundColor: isLimitReached ? addOpacity("#EF4444", 0.12) : addOpacity(colors.primary, 0.12) }]}>
                <IconSymbol name="message.fill" size={14} color={isLimitReached ? "#EF4444" : colors.primary} />
                <Text style={[styles.heroPillText, { color: isLimitReached ? "#EF4444" : colors.primary }]}>
                  {isLimitReached ? "تم بلوغ الحد" : `${messagesLeft} رسالة متبقية`}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>ابدأ محادثة جديدة</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            اسأل عن الأسهم، العقود، أو اطلب استشارة مباشرة من المستشار الشرعي.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              onPress={handleNewChat}
              style={({ pressed }) => [
                styles.heroCta,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
              <Text style={styles.heroCtaText}>بدء محادثة</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/stock" as any)}
              style={({ pressed }) => [
                styles.heroGhost,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.heroGhostText, { color: colors.foreground }]}>فحص سهم</Text>
            </Pressable>
          </View>
        </View>

        {/* Modern Action Cards */}
        <View style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ابدأ باستخدام خبير</Text>
          {suggestionCards.map((card) => (
            <Pressable
              key={card.id}
              onPress={card.action}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.actionIconBox, { backgroundColor: addOpacity(colors.primary, 0.12) }]}>
                <IconSymbol name={card.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionRowTitle, { color: colors.foreground }]}>{card.title}</Text>
                <Text style={[styles.actionRowSubtitle, { color: colors.muted }]}>{card.subtitle}</Text>
              </View>
              <IconSymbol name="chevron.left" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {/* Quick Prompts */}
        <View style={styles.promptsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>أسئلة شائعة</Text>
          <View style={styles.promptsGrid}>
            {quickPrompts.map((prompt, index) => (
              <Pressable
                key={index}
                onPress={() => handleQuickPrompt(prompt)}
                style={({ pressed }) => [
                  styles.promptButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <IconSymbol name="sparkle" size={14} color={colors.primary} />
                <Text style={[styles.promptButtonText, { color: colors.foreground }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
  );

  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1.5 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: addOpacity(colors.primary, 0.15) }]}>
              <IconSymbol name="sparkles" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.headerOverline, { color: colors.muted }]}>لوحة خبير</Text>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>{user?.name || "زائر"}</Text>
            </View>
          </View>
          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [
              styles.newChatButton,
              { backgroundColor: addOpacity(colors.primary, 0.1), opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityLabel="بدء محادثة جديدة"
          >
            <IconSymbol name="plus.circle.fill" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.conversationShell}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Loading indicator when sending */}
        {isLoading && messages.length > 0 && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LoadingState message="جاري التفكير..." />
          </View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={handleAttachFile}
              style={({ pressed }) => [
                styles.attachButton,
                {
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconSymbol
                name="paperclip"
                size={20}
                color={colors.muted}
              />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="اسأل سؤالك هنا..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor:
                    inputText.trim() && !isLoading
                      ? colors.primary
                      : addOpacity(colors.muted, 0.25),
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <IconSymbol
                name="paperplane.fill"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F4F1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  headerOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  newChatButton: {
    padding: 10,
    borderRadius: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 110,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  usageCard: {
    width: "100%",
    maxWidth: 400,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.4,
    marginBottom: 26,
  },
  usageContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  usageIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  usageText: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  upgradeButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 17,
    fontWeight: "400",
    marginBottom: 30,
    lineHeight: 24,
  },
  // Modern Actions Section
  actionsContainer: {
    width: "100%",
    maxWidth: 420,
    marginBottom: 28,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  actionRowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroCard: {
    width: "100%",
    maxWidth: 420,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.2,
    gap: 12,
    marginBottom: 22,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b6460",
  },
  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroCtaText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  heroGhost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroGhostText: {
    fontWeight: "700",
    fontSize: 14,
  },
  // Quick Prompts Section
  promptsContainer: {
    width: "100%",
    maxWidth: 420,
  },
  promptsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  promptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  promptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  messagesList: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  conversationShell: {
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 2,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
    flexDirection: "row-reverse",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
    flexDirection: "row",
  },
  avatarContainer: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginStart: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomStartRadius: 6,
    borderWidth: 1.2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sourcesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sourceLink: {
    fontSize: 12,
    marginTop: 4,
  },
  loadingContainer: {
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  inputContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 28,
    borderWidth: 1.8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 110,
    paddingVertical: 8,
    textAlign: "right",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
});

