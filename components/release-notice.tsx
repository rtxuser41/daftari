import Constants from "expo-constants";
import { useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { RELEASE_NOTICE_CONFIG } from "@/constants/release-notice";
import { useColors } from "@/hooks/use-colors";
import { resolveReleaseNotice } from "@/lib/release-notice";

const currentVersion = Constants.expoConfig?.version ?? "";

export function ReleaseNoticeBanner() {
  const colors = useColors();
  const [opening, setOpening] = useState(false);
  const notice = resolveReleaseNotice(currentVersion, RELEASE_NOTICE_CONFIG);
  if (notice.state !== "available") return null;

  const openDownload = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await Linking.openURL(notice.url);
    } catch {
      Alert.alert("تعذر فتح الرابط", "تحقق من اتصالك أو افتح رابط التنزيل لاحقًا.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        padding: 15,
        marginBottom: 16,
        backgroundColor: colors.infoSurface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
      }}
    >
      <MaterialIcons name="system-update" size={22} color={colors.primary} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 13,
            fontWeight: "900",
            textAlign: "right",
          }}
        >
          تحديث متاح · الإصدار {notice.version}
        </Text>
        <Text
          style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }}
        >
          افتح رابط التنزيل بنفسك؛ لن يتم تثبيت أي شيء تلقائيًا.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`فتح رابط تنزيل الإصدار ${notice.version}`}
          disabled={opening}
          onPress={() => void openDownload()}
          style={({ pressed }) => ({ alignSelf: "flex-end", paddingVertical: 5, opacity: pressed || opening ? 0.65 : 1 })}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>
            عرض رابط التنزيل
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ReleaseAvailabilityCard() {
  const colors = useColors();
  const notice = resolveReleaseNotice(currentVersion, RELEASE_NOTICE_CONFIG);
  const description =
    notice.state === "available"
      ? `إصدار ${notice.version} مهيّأ كرابط إعلان محلي. النقر يفتح الرابط فقط ولا يثبت التطبيق.`
      : notice.state === "invalid"
        ? "تعذر عرض الإعلان؛ يجب ضبط إصدار أحدث ورابط تنزيل يبدأ بـ HTTPS."
        : notice.state === "not-newer"
          ? "لا يوجد إصدار أحدث مضبوط حاليًا."
          : "لا يوجد رابط إصدار جديد مضبوط في هذه النسخة. لا توجد قناة تحديث أو تنبيه مباشر للمستخدمين.";

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 15,
          fontWeight: "900",
          textAlign: "right",
          marginBottom: 10,
        }}
      >
        إعلانات التحديث
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          padding: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 17,
        }}
      >
        <MaterialIcons name="info-outline" size={19} color={colors.muted} />
        <Text style={{ flex: 1, color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "right" }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
