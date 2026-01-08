import { useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { trpc } from "@/lib/trpc";

interface Question {
  id: number;
  question: string;
  type: "yesno" | "text" | "percentage" | "select";
  options?: string[];
  category: string;
}

const questions: Question[] = [
  {
    id: 1,
    question: "ما هو اسم الشركة؟",
    type: "text",
    category: "معلومات أساسية",
  },
  {
    id: 2,
    question: "ما هو النشاط الرئيسي للشركة؟",
    type: "select",
    options: [
      "تقنية المعلومات",
      "البنوك والتمويل",
      "التجزئة",
      "الصناعة",
      "العقارات",
      "الأغذية والمشروبات",
      "الرعاية الصحية",
      "أخرى",
    ],
    category: "معلومات أساسية",
  },
  {
    id: 3,
    question: "هل الشركة تتعامل بالربا (فوائد بنكية)؟",
    type: "yesno",
    category: "المعاملات المالية",
  },
  {
    id: 4,
    question: "ما نسبة الديون الربوية إلى إجمالي الأصول؟",
    type: "percentage",
    category: "المعاملات المالية",
  },
  {
    id: 5,
    question: "هل الشركة تستثمر في أدوات مالية محرمة (سندات ربوية)؟",
    type: "yesno",
    category: "الاستثمارات",
  },
  {
    id: 6,
    question: "ما نسبة الإيرادات من مصادر محرمة (إن وجدت)؟",
    type: "percentage",
    category: "الإيرادات",
  },
  {
    id: 7,
    question: "هل الشركة تنتج أو تبيع منتجات محرمة (خمور، تبغ، قمار)؟",
    type: "yesno",
    category: "المنتجات",
  },
  {
    id: 8,
    question: "هل لدى الشركة هيئة رقابة شرعية؟",
    type: "yesno",
    category: "الحوكمة الشرعية",
  },
  {
    id: 9,
    question: "ما نسبة النقد والاستثمارات قصيرة الأجل إلى إجمالي الأصول؟",
    type: "percentage",
    category: "السيولة",
  },
  {
    id: 10,
    question: "هل الشركة تدفع زكاة أموالها؟",
    type: "yesno",
    category: "الزكاة",
  },
];

export default function CompanyTestScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    status: "compliant" | "non-compliant" | "mixed";
    score: number;
    details: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      analyzeResults();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const buildPrompt = () => {
    const answersText = questions
      .map((q) => `${q.question}: ${answers[q.id] || "لم يتم الإجابة"}`)
      .join("\n");

    return `قم بتحليل مدى توافق الشركة مع الشريعة الإسلامية بناءً على الإجابات التالية:

${answersText}

أعِد النتائج في صيغة منسقة ومختصرة:
- الحالة: متوافقة / غير متوافقة / مختلطة
- النسبة: رقم من 0 إلى 100
- إيجابيات: نقاط مختصرة
- مخاطر: نقاط مختصرة
- توصية: جملة أو جملتين.

التزم بالإيجاز (لا فقرة طويلة).`;
  };

  const parseAiResponse = (text: string) => {
    let status: "compliant" | "non-compliant" | "mixed" = "mixed";
    let score = 50;

    const percentMatch = text.match(/(\d{1,3})\s*%/);
    if (percentMatch) {
      score = Math.min(100, Math.max(0, parseInt(percentMatch[1])));
    }

    const normalized = text.replace(/\s+/g, " ");
    if (normalized.includes("غير متوافقة")) status = "non-compliant";
    else if (normalized.includes("متوافقة")) status = "compliant";
    else status = "mixed";

    if (score >= 70) status = "compliant";
    else if (score < 40) status = "non-compliant";

    const bullets = text
      .split(/\n|[-•]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return {
      status,
      score,
      details: bullets.length ? bullets : [text.trim()],
    };
  };

  const computeFallbackResult = () => {
    // Simple deterministic scoring from answers to avoid empty/error state
    let score = 100;

    const yesIfRisk = (id: number, weight: number) => {
      if (answers[id] === "نعم") score -= weight;
    };
    const percentDeduct = (id: number, weightPer10: number) => {
      const v = parseInt(answers[id] || "0", 10);
      if (!isNaN(v) && v > 0) score -= Math.min(100, Math.ceil(v / 10) * weightPer10);
    };

    yesIfRisk(3, 25); // ربا
    yesIfRisk(5, 20); // أدوات محرمة
    yesIfRisk(7, 30); // منتجات محرمة
    percentDeduct(4, 5);
    percentDeduct(6, 5);
    percentDeduct(9, 3);

    score = Math.max(0, Math.min(100, score));
    let status: "compliant" | "non-compliant" | "mixed" = "mixed";
    if (score >= 70) status = "compliant";
    else if (score < 40) status = "non-compliant";

    const details: string[] = [];
    details.push(`النسبة التقديرية: ${score}%`);
    if (answers[3] === "نعم") details.push("يوجد تعامل بالربا (فوائد بنكية).");
    if (answers[5] === "نعم") details.push("استثمار في أدوات مالية محرمة.");
    if (answers[7] === "نعم") details.push("منتجات محرمة ضمن نشاط الشركة.");
    if (answers[8] !== "نعم") details.push("لا يوجد إشراف شرعي واضح.");
    if (answers[10] !== "نعم") details.push("زكاة الشركة غير مؤكدة أو غير مدفوعة.");
    if (details.length === 1) details.push("لا توجد مخاطر كبيرة ظاهرة من الإجابات المتاحة.");

    return { status, score, details };
  };

  const analyzeResults = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = buildPrompt();
      const response = await chatMutation.mutateAsync({ message: prompt });
      const parsed = parseAiResponse(response.reply || "");
      setResult(parsed);
    } catch (error) {
      const fallback = computeFallbackResult();
      setResult(fallback);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = () => {
    switch (result?.status) {
      case "compliant":
        return "#22C55E";
      case "non-compliant":
        return "#EF4444";
      default:
        return "#F59E0B";
    }
  };

  const getStatusText = () => {
    switch (result?.status) {
      case "compliant":
        return "متوافقة مع الشريعة";
      case "non-compliant":
        return "غير متوافقة";
      default:
        return "تحتاج مراجعة";
    }
  };

  if (result) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <ScrollView className="flex-1 px-5">
          {/* Header */}
          <View className="flex-row items-center justify-between py-4">
            <AnimatedPressable onPress={() => router.back()}>
              <Text className="text-primary text-lg">رجوع</Text>
            </AnimatedPressable>
            <Text className="text-xl font-bold text-foreground">نتيجة التحليل</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Result Card */}
          <View className="bg-surface rounded-3xl p-6 border border-border mt-4">
            <View className="items-center mb-6">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${getStatusColor()}20` }}
              >
                <Text className="text-4xl">
                  {result.status === "compliant"
                    ? "✅"
                    : result.status === "non-compliant"
                    ? "❌"
                    : "⚠️"}
                </Text>
              </View>
              <Text
                className="text-2xl font-bold mb-2"
                style={{ color: getStatusColor() }}
              >
                {getStatusText()}
              </Text>
              <Text className="text-4xl font-bold text-foreground">
                {result.score}%
              </Text>
              <Text className="text-muted">نسبة التوافق</Text>
            </View>

            {/* Details */}
            <View className="space-y-3">
              {result.details.map((detail, index) => (
                <Text key={index} className="text-foreground leading-6">
                  {detail}
                </Text>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View className="mt-6 mb-8 gap-3">
            <AnimatedPressable
              onPress={() => {
                setResult(null);
                setCurrentStep(0);
                setAnswers({});
              }}
              className="bg-primary py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-semibold text-lg">
                اختبار شركة أخرى
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => router.back()}
              className="bg-surface py-4 rounded-2xl items-center border border-border"
            >
              <Text className="text-foreground font-semibold text-lg">
                العودة للرئيسية
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (isAnalyzing) {
    return (
      <ScreenContainer className="items-center justify-center">
        <View className="items-center">
          <LinearGradient
            colors={["#8B1538", "#C9375D"]}
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
          >
            <Text className="text-white text-3xl">🔍</Text>
          </LinearGradient>
          <Text className="text-xl font-bold text-foreground mb-2">
            جاري التحليل...
          </Text>
          <Text className="text-muted text-center">
            نقوم بتحليل بيانات الشركة وفقاً للمعايير الشرعية
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <AnimatedPressable onPress={() => router.back()}>
          <Text className="text-primary text-lg">إلغاء</Text>
        </AnimatedPressable>
        <Text className="text-xl font-bold text-foreground">اختبار الشركة</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Progress */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-muted text-sm">
            السؤال {currentStep + 1} من {questions.length}
          </Text>
          <Text className="text-muted text-sm">{Math.round(progress)}%</Text>
        </View>
        <View className="h-2 bg-surface rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      {/* Question */}
      <ScrollView className="flex-1 px-5">
        <View className="bg-surface rounded-3xl p-6 border border-border">
          <Text className="text-xs text-primary font-medium mb-2">
            {currentQuestion.category}
          </Text>
          <Text className="text-xl font-bold text-foreground mb-6">
            {currentQuestion.question}
          </Text>

          {/* Answer Options */}
          {currentQuestion.type === "yesno" && (
            <View className="flex-row gap-3">
              <AnimatedPressable
                onPress={() => handleAnswer("نعم")}
                className={`flex-1 py-4 rounded-2xl items-center border ${
                  answers[currentQuestion.id] === "نعم"
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                <Text
                  className={`font-semibold text-lg ${
                    answers[currentQuestion.id] === "نعم"
                      ? "text-white"
                      : "text-foreground"
                  }`}
                >
                  نعم
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => handleAnswer("لا")}
                className={`flex-1 py-4 rounded-2xl items-center border ${
                  answers[currentQuestion.id] === "لا"
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                <Text
                  className={`font-semibold text-lg ${
                    answers[currentQuestion.id] === "لا"
                      ? "text-white"
                      : "text-foreground"
                  }`}
                >
                  لا
                </Text>
              </AnimatedPressable>
            </View>
          )}

          {currentQuestion.type === "text" && (
            <TextInput
              value={answers[currentQuestion.id] || ""}
              onChangeText={(text) => handleAnswer(text)}
              placeholder="اكتب إجابتك هنا..."
              placeholderTextColor="#9BA1A6"
              className="bg-background border border-border rounded-2xl px-4 py-4 text-foreground text-right"
              style={{ textAlign: "right" }}
            />
          )}

          {currentQuestion.type === "percentage" && (
            <View>
              <TextInput
                value={answers[currentQuestion.id] || ""}
                onChangeText={(text) => handleAnswer(text.replace(/[^0-9]/g, ""))}
                placeholder="0"
                placeholderTextColor="#9BA1A6"
                keyboardType="numeric"
                maxLength={3}
                className="bg-background border border-border rounded-2xl px-4 py-4 text-foreground text-center text-2xl font-bold"
              />
              <Text className="text-center text-muted mt-2">%</Text>
            </View>
          )}

          {currentQuestion.type === "select" && currentQuestion.options && (
            <View className="gap-2">
              {currentQuestion.options.map((option) => (
                <AnimatedPressable
                  key={option}
                  onPress={() => handleAnswer(option)}
                  className={`py-3 px-4 rounded-xl border ${
                    answers[currentQuestion.id] === option
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  }`}
                >
                  <Text
                    className={`text-center ${
                      answers[currentQuestion.id] === option
                        ? "text-white font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {option}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View className="flex-row gap-3 px-5 py-4">
        {currentStep > 0 && (
          <AnimatedPressable
            onPress={handleBack}
            className="flex-1 bg-surface py-4 rounded-2xl items-center border border-border"
          >
            <Text className="text-foreground font-semibold text-lg">السابق</Text>
          </AnimatedPressable>
        )}
        <AnimatedPressable
          onPress={handleNext}
          disabled={!answers[currentQuestion.id]}
          style={{
            flex: 1,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            backgroundColor: answers[currentQuestion.id] ? "#8B1538" : "#D1D5DB",
            opacity: answers[currentQuestion.id] ? 1 : 0.6,
            shadowColor: "#8B1538",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: answers[currentQuestion.id] ? 0.3 : 0,
            shadowRadius: 8,
            elevation: answers[currentQuestion.id] ? 4 : 0,
          }}
        >
          <Text style={{ 
            color: "#FFFFFF", 
            fontWeight: "bold", 
            fontSize: 18,
            letterSpacing: 0.5,
          }}>
            {currentStep === questions.length - 1 ? "تحليل النتائج ←" : "التالي ←"}
          </Text>
        </AnimatedPressable>
      </View>
    </ScreenContainer>
  );
}
