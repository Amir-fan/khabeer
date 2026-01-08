import { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, Animated, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPressable } from "@/components/animated-pressable";
import { trpc } from "@/lib/trpc";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";

// Custom Icons
const Icons = {
  back: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  folder: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  document: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  contract: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  fatwa: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  report: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M18 20V10M12 20V4M6 20v-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  user: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  public: (color: string) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  download: (color: string) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

const tabs = [
  { id: "my", label: "ملفاتي", icon: Icons.user, description: "ملفات من المستشار والأدمن" },
  { id: "public", label: "المكتبة العامة", icon: Icons.public, description: "فتاوى ومراجع شرعية" },
];

const fileTypes = [
  { id: "all", label: "الكل", icon: Icons.folder },
  { id: "report", label: "التقارير", icon: Icons.report },
  { id: "contract", label: "العقود", icon: Icons.contract },
  { id: "fatwa", label: "الفتاوى", icon: Icons.fatwa },
];

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("my");
  const [selectedType, setSelectedType] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const { data: filesData, refetch, isLoading } = trpc.library.list.useQuery(undefined, {
    retry: false,
    enabled: true,
  });

  // Mutation to get download URL on demand
  const getDownloadUrlMutation = trpc.library.getDownloadUrl.useMutation();

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await refetch();
    setRefreshing(false);
  };

  // Format files from backend (backend already filters by visibility)
  const formatted = (filesData || []).map((f: any) => {
    const type = f.mimeType?.includes("pdf")
      ? "report"
      : f.mimeType?.includes("image")
      ? "fatwa"
      : "document";
    const sizeMb = f.fileSize ? `${(f.fileSize / (1024 * 1024)).toFixed(1)} MB` : "—";
    const source =
      f.createdByRole === "admin"
        ? "أدمن"
        : f.createdByRole === "advisor"
        ? "مستشار"
        : "مكتبة";
    return {
      id: f.id,
      name: f.title,
      type,
      status: "analyzed",
      source,
      createdAt: f.createdAt,
      size: sizeMb,
      isPublic: f.isPublic,
      targetUserId: f.targetUserId,
      // Note: fileUrl is not exposed - use getDownloadUrl endpoint instead
    };
  });

  // Filter by tab for UI organization
  // NOTE: Backend already enforces visibility rules (listLibraryFilesForUser)
  // Backend returns only files where: isPublic = true OR targetUserId = currentUser.id
  // Frontend filtering here is purely for UI organization (separating tabs)
  // "my" tab = personal files (advisor → user, isPublic = false)
  // "public" tab = public files (admin → all, isPublic = true)
  const files = activeTab === "my"
    ? formatted.filter((f: any) => !f.isPublic) // Personal files (advisor → user)
    : formatted.filter((f: any) => f.isPublic); // Public files (admin → all)

  const filteredFiles = selectedType === "all"
    ? files
    : files.filter((f: any) => f.type === selectedType);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "analyzed": return "#22C55E";
      case "analyzing": return "#F59E0B";
      case "pending": return "#9BA1A6";
      default: return "#EF4444";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "analyzed": return "متاح";
      case "analyzing": return "جاري المعالجة";
      case "pending": return "في الانتظار";
      default: return "خطأ";
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "report": return Icons.report;
      case "contract": return Icons.contract;
      case "fatwa": return Icons.fatwa;
      default: return Icons.document;
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
            {Icons.back("#687076")}
          </AnimatedPressable>
          <View style={styles.headerCenter}>
            <LinearGradient colors={["#8B1538", "#C9375D"]} style={styles.headerIcon}>
              {Icons.folder("#FFFFFF")}
            </LinearGradient>
            <Text style={styles.headerTitle}>المكتبة</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <AnimatedPressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
style={StyleSheet.flatten([
                  styles.tab,
                  activeTab === tab.id ? styles.tabActive : {},
                ])}
            >
              <View style={styles.tabContent}>
                {tab.icon(activeTab === tab.id ? "#8B1538" : "#687076")}
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive,
                ]}>
                  {tab.label}
                </Text>
              </View>
              {activeTab === tab.id && (
                <Text style={styles.tabDescription}>{tab.description}</Text>
              )}
            </AnimatedPressable>
          ))}
        </View>

        {/* File Types Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {fileTypes.map((type) => (
            <AnimatedPressable
              key={type.id}
              onPress={() => {
                setSelectedType(type.id);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={StyleSheet.flatten([
                styles.filterChip,
                selectedType === type.id ? styles.filterChipActive : {},
              ])}
            >
              {type.icon(selectedType === type.id ? "#FFFFFF" : "#687076")}
              <Text style={[
                styles.filterLabel,
                selectedType === type.id && styles.filterLabelActive,
              ]}>
                {type.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        {/* Files List */}
        <ScrollView
          style={styles.filesList}
          contentContainerStyle={styles.filesContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B1538"
              colors={["#8B1538"]}
            />
          }
        >
          {filteredFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                {Icons.folder("#C9B896")}
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "my" ? "لا توجد ملفات" : "لا توجد مراجع"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "my" 
                  ? "ستظهر هنا الملفات المرسلة من المستشار أو الأدمن"
                  : "ستظهر هنا الفتاوى والمراجع الشرعية العامة"
                }
              </Text>
            </View>
          ) : (
            filteredFiles.map((file: any, index: number) => (
              <Animated.View
                key={file.id}
                style={[
                  styles.fileCard,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
              >
                <AnimatedPressable style={styles.fileCardInner}>
                  <View style={styles.fileIconContainer}>
                    <LinearGradient
                      colors={["#8B153820", "#C9375D10"]}
                      style={styles.fileIconBg}
                    >
                      {getFileIcon(file.type)("#8B1538")}
                    </LinearGradient>
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={2}>
                      {file.name}
                    </Text>
                    <View style={styles.fileMeta}>
                      <View style={styles.sourceTag}>
                        <Text style={styles.sourceText}>{file.source}</Text>
                      </View>
                      <Text style={styles.fileSize}>{file.size}</Text>
                      <Text style={styles.fileDate}>
                        {new Date(file.createdAt).toLocaleDateString("ar-SA")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.fileActions}>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(file.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(file.status) }]}>
                        {getStatusText(file.status)}
                      </Text>
                    </View>
                    <AnimatedPressable
                      style={styles.downloadButton}
                      onPress={async () => {
                        try {
                          // Get signed download URL on demand (generated fresh each time, not cached)
                          const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                          
                          if (result?.downloadUrl) {
                            // Open the signed URL (expires in 5 minutes)
                            const Linking = require("expo-linking");
                            await Linking.openURL(result.downloadUrl);
                          }
                        } catch (error: any) {
                          console.error("Error downloading file:", error);
                          // Show error to user
                          Alert.alert("خطأ", error?.message || "فشل في تحميل الملف");
                        }
                      }}
                      disabled={getDownloadUrlMutation.isPending}
                    >
                      {Icons.download("#8B1538")}
                    </AnimatedPressable>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </Animated.View>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#11181C",
  },
  placeholder: {
    width: 44,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    backgroundColor: "#F5F5F0",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#8B153810",
    borderColor: "#8B1538",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#687076",
  },
  tabLabelActive: {
    color: "#8B1538",
  },
  tabDescription: {
    fontSize: 12,
    color: "#9BA1A6",
    textAlign: "right",
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F0",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#8B1538",
    borderColor: "#8B1538",
  },
  filterLabel: {
    fontSize: 14,
    color: "#687076",
  },
  filterLabelActive: {
    color: "#FFFFFF",
  },
  filesList: {
    flex: 1,
  },
  filesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9BA1A6",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  fileCard: {
    marginBottom: 12,
  },
  fileCardInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fileIconContainer: {
    marginLeft: 12,
  },
  fileIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#11181C",
    textAlign: "right",
    marginBottom: 6,
  },
  fileMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  sourceTag: {
    backgroundColor: "#C9B89620",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 11,
    color: "#8B7355",
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  fileDate: {
    fontSize: 12,
    color: "#9BA1A6",
  },
  fileActions: {
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8B153810",
    alignItems: "center",
    justifyContent: "center",
  },
});
