import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
        <AnimatedPressable onPress={() => router.back()}>
          <View className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-border">
            <Text className="text-lg">→</Text>
          </View>
        </AnimatedPressable>
        <Text className="text-xl font-bold text-foreground">سياسة الخصوصية</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-foreground text-base leading-7 text-right">
          <Text className="font-bold text-xl">سياسة الخصوصية لمنصة ذمة{"\n\n"}</Text>
          
          <Text className="text-muted">آخر تحديث: 1 يناير 2025{"\n\n"}</Text>
          
          <Text className="font-bold text-lg">1. المقدمة{"\n"}</Text>
          نحن في منصة ذمة نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك.{"\n\n"}
          
          <Text className="font-bold text-lg">2. البيانات التي نجمعها{"\n"}</Text>
          • معلومات الحساب (الاسم، البريد الإلكتروني، رقم الهاتف){"\n"}
          • سجل المحادثات مع المستشار الذكي{"\n"}
          • الملفات المرفوعة للتحليل{"\n"}
          • معلومات الجهاز والاستخدام{"\n\n"}
          
          <Text className="font-bold text-lg">3. كيف نستخدم بياناتك{"\n"}</Text>
          • تقديم الاستشارات الشرعية المالية{"\n"}
          • تحسين خدماتنا وتجربة المستخدم{"\n"}
          • إرسال الإشعارات المهمة{"\n"}
          • تحليل الأسهم والعقود{"\n\n"}
          
          <Text className="font-bold text-lg">4. حماية البيانات{"\n"}</Text>
          نستخدم تقنيات تشفير متقدمة لحماية بياناتك. جميع الاتصالات مشفرة باستخدام SSL/TLS.{"\n\n"}
          
          <Text className="font-bold text-lg">5. مشاركة البيانات{"\n"}</Text>
          لا نبيع أو نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:{"\n"}
          • بموافقتك الصريحة{"\n"}
          • للامتثال للمتطلبات القانونية{"\n"}
          • لحماية حقوقنا القانونية{"\n\n"}
          
          <Text className="font-bold text-lg">6. حقوقك{"\n"}</Text>
          • طلب نسخة من بياناتك{"\n"}
          • تصحيح معلوماتك{"\n"}
          • حذف حسابك{"\n"}
          • إلغاء الاشتراك في الإشعارات{"\n\n"}
          
          <Text className="font-bold text-lg">7. ملفات تعريف الارتباط{"\n"}</Text>
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر تفضيلاتك.{"\n\n"}
          
          <Text className="font-bold text-lg">8. التواصل معنا{"\n"}</Text>
          للاستفسارات حول الخصوصية، تواصل معنا عبر:{"\n"}
          البريد: privacy@thimmah.com{"\n\n"}
          
          <Text className="text-muted text-sm">
            © 2025 منصة ذمة. جميع الحقوق محفوظة.
          </Text>
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
