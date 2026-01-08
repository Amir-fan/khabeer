import { useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { trpc } from "@/lib/trpc";

const fileTypes = [
  { id: "all", label: "الكل", icon: "📁" },
  { id: "report", label: "التقارير", icon: "📊" },
  { id: "contract", label: "العقود", icon: "📄" },
  { id: "fatwa", label: "الفتاوى", icon: "📜" },
];

export default function VaultScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: filesData, refetch } = trpc.files.list.useQuery({
    type: selectedType === "all" ? undefined : selectedType,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Sample files for display
  const sampleFiles = [
    {
      id: 1,
      name: "تقرير فحص سهم أرامكو",
      type: "report",
      status: "analyzed",
      createdAt: new Date().toISOString(),
      size: "2.5 MB",
    },
    {
      id: 2,
      name: "عقد مرابحة عقارية",
      type: "contract",
      status: "analyzed",
      createdAt: new Date().toISOString(),
      size: "1.2 MB",
    },
    {
      id: 3,
      name: "فتوى الاستثمار في الذهب",
      type: "fatwa",
      status: "analyzed",
      createdAt: new Date().toISOString(),
      size: "500 KB",
    },
  ];

  const files = filesData || sampleFiles;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "analyzed":
        return "#22C55E";
      case "analyzing":
        return "#F59E0B";
      case "pending":
        return "#9BA1A6";
      default:
        return "#EF4444";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "analyzed":
        return "تم التحليل";
      case "analyzing":
        return "جاري التحليل";
      case "pending":
        return "في الانتظار";
      default:
        return "خطأ";
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <AnimatedPressable onPress={() => router.back()}>
          <View className="w-10 h-10 bg-surface rounded-full items-center justify-center border border-border">
            <Text className="text-lg">→</Text>
          </View>
        </AnimatedPressable>
        <Text className="text-xl font-bold text-foreground">ملفاتي</Text>
        <AnimatedPressable
          onPress={() => router.push("/contract")}
          className="w-10 h-10 bg-primary rounded-full items-center justify-center"
        >
          <Text className="text-white text-xl">+</Text>
        </AnimatedPressable>
      </View>

      {/* File Types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5 mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {fileTypes.map((type) => (
          <AnimatedPressable
            key={type.id}
            onPress={() => setSelectedType(type.id)}
            className={`flex-row items-center px-4 py-2 rounded-full gap-2 ${
              selectedType === type.id
                ? "bg-primary"
                : "bg-surface border border-border"
            }`}
          >
            <Text>{type.icon}</Text>
            <Text
              className={`${
                selectedType === type.id ? "text-white" : "text-foreground"
              }`}
            >
              {type.label}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* Files List */}
      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {files.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-6xl mb-4">📂</Text>
            <Text className="text-foreground font-bold text-lg mb-2">
              لا توجد ملفات
            </Text>
            <Text className="text-muted text-center">
              قم برفع ملفاتك للحصول على تحليل شرعي
            </Text>
          </View>
        ) : (
          files.map((file: any) => (
            <AnimatedPressable
              key={file.id}
              className="bg-surface rounded-2xl p-4 mb-3 border border-border"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
                    <Text className="text-2xl">
                      {fileTypes.find((t) => t.id === file.type)?.icon || "📄"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium text-right mb-1">
                      {file.name}
                    </Text>
                    <View className="flex-row items-center justify-end gap-2">
                      <Text className="text-muted text-xs">{file.size}</Text>
                      <Text className="text-muted text-xs">•</Text>
                      <Text className="text-muted text-xs">
                        {new Date(file.createdAt).toLocaleDateString("ar-SA")}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${getStatusColor(file.status)}20` }}
                >
                  <Text
                    className="text-xs"
                    style={{ color: getStatusColor(file.status) }}
                  >
                    {getStatusText(file.status)}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
