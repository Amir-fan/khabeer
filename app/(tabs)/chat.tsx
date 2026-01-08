import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; url: string }[];
}

const suggestedQuestions = [
  "ما حكم التأمين التجاري؟",
  "هل الأسهم الأمريكية حلال؟",
  "كيف أتحقق من شرعية العقد؟",
];

export default function ChatScreen() {
  const colors = useColors();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "السلام عليكم ورحمة الله وبركاته 👋\n\nأنا مستشارك الشرعي في ذمة. يمكنني مساعدتك في:\n\n• تحليل العقود والاتفاقيات\n• فحص توافق الأسهم مع الشريعة\n• الإجابة على استفساراتك المالية الشرعية\n\nكيف يمكنني مساعدتك اليوم؟",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content,
        context: "islamic_finance",
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply || "عذراً، حدث خطأ.",
        timestamp: new Date(),
        sources: response.sources as { title: string; url: string }[] | undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, chatMutation]);

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {item.content}
          </Text>
          {item.sources && item.sources.length > 0 && (
            <View style={[styles.sourcesContainer, { borderTopColor: colors.border }]}>
              <Text style={[styles.sourcesTitle, { color: colors.muted }]}>المصادر:</Text>
              {item.sources.map((source, index) => (
                <Text key={index} style={[styles.sourceLink, { color: colors.primary }]}>
                  [{index + 1}] {source.title}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="questionmark.circle.fill" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>المستشار الشرعي</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>متصل الآن</Text>
          </View>
        </View>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <View style={styles.suggestedContainer}>
            <Text style={[styles.suggestedTitle, { color: colors.muted }]}>اقتراحات:</Text>
            <View style={styles.suggestedChips}>
              {suggestedQuestions.map((question, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSuggestedQuestion(question)}
                  style={({ pressed }) => [
                    styles.suggestedChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.suggestedChipText, { color: colors.foreground }]}>
                    {question}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>جاري الكتابة...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.attachButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.muted} />
          </Pressable>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border },
            ]}
            placeholder="اكتب سؤالك هنا..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: inputText.trim() ? colors.primary : colors.muted },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  suggestedContainer: {
    padding: 16,
  },
  suggestedTitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  suggestedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestedChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestedChipText: {
    fontSize: 13,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  assistantMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sourcesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sourcesTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  sourceLink: {
    fontSize: 12,
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
  },
  attachButton: {
    padding: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    fontSize: 15,
    textAlign: "right",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
