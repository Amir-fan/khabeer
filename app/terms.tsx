import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";

export default function TermsScreen() {
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
        <Text className="text-xl font-bold text-foreground">الشروط والأحكام</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-foreground text-base leading-7 text-right">
          <Text className="font-bold text-xl">الشروط والأحكام لمنصة ذمة{"\n\n"}</Text>
          
          <Text className="text-muted">آخر تحديث: 1 يناير 2025{"\n\n"}</Text>
          
          <Text className="font-bold text-lg">1. القبول{"\n"}</Text>
          باستخدامك لمنصة ذمة، فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام المنصة.{"\n\n"}
          
          <Text className="font-bold text-lg">2. الخدمات{"\n"}</Text>
          تقدم منصة ذمة الخدمات التالية:{"\n"}
          • استشارات شرعية مالية عبر الذكاء الاصطناعي{"\n"}
          • فحص الأسهم للتوافق الشرعي{"\n"}
          • تحليل العقود من المنظور الشرعي{"\n"}
          • استشارات مع مستشارين شرعيين معتمدين{"\n\n"}
          
          <Text className="font-bold text-lg">3. إخلاء المسؤولية{"\n"}</Text>
          • الاستشارات المقدمة للاسترشاد فقط ولا تعتبر فتوى رسمية{"\n"}
          • يجب استشارة عالم شرعي معتمد للقرارات المهمة{"\n"}
          • المنصة غير مسؤولة عن القرارات المالية المتخذة{"\n\n"}
          
          <Text className="font-bold text-lg">4. الاشتراكات{"\n"}</Text>
          • الباقات المدفوعة تجدد تلقائياً{"\n"}
          • يمكن الإلغاء في أي وقت قبل التجديد{"\n"}
          • لا يوجد استرداد للمبالغ المدفوعة{"\n"}
          • الأسعار قابلة للتغيير مع إشعار مسبق{"\n\n"}
          
          <Text className="font-bold text-lg">5. حساب المستخدم{"\n"}</Text>
          • أنت مسؤول عن الحفاظ على سرية حسابك{"\n"}
          • يجب تقديم معلومات صحيحة ودقيقة{"\n"}
          • يحق لنا تعليق الحسابات المخالفة{"\n\n"}
          
          <Text className="font-bold text-lg">6. الاستخدام المقبول{"\n"}</Text>
          يُحظر استخدام المنصة لـ:{"\n"}
          • أي نشاط غير قانوني{"\n"}
          • نشر محتوى مسيء أو ضار{"\n"}
          • محاولة اختراق أو تعطيل الخدمة{"\n\n"}
          
          <Text className="font-bold text-lg">7. الملكية الفكرية{"\n"}</Text>
          جميع الحقوق محفوظة لمنصة ذمة، بما في ذلك:{"\n"}
          • العلامة التجارية والشعار{"\n"}
          • المحتوى والتصميم{"\n"}
          • الخوارزميات والتقنيات{"\n\n"}
          
          <Text className="font-bold text-lg">8. تعديل الشروط{"\n"}</Text>
          نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعارك بالتغييرات الجوهرية.{"\n\n"}
          
          <Text className="font-bold text-lg">9. القانون المعمول به{"\n"}</Text>
          تخضع هذه الشروط لقوانين المملكة العربية السعودية.{"\n\n"}
          
          <Text className="font-bold text-lg">10. التواصل{"\n"}</Text>
          للاستفسارات: support@thimmah.com{"\n\n"}
          
          <Text className="text-muted text-sm">
            © 2025 منصة ذمة. جميع الحقوق محفوظة.
          </Text>
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
