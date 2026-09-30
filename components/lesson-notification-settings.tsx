import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useColors } from "@/hooks/use-colors";
import { useDaftar } from "@/lib/daftar-store";
import { cancelLessonReminders, getLessonNotificationPermission, lessonReminderTimeLabel, NOTIFICATIONS_ENABLED_KEY, requestLessonNotificationPermission, scheduleLessonReminders } from "@/lib/notifications";

export function LessonNotificationSettings() {
  const colors = useColors();
  const { state } = useDaftar();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("unknown");

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY), getLessonNotificationPermission()]).then(([saved, permission]) => {
      if (!active) return;
      setPermissionStatus(permission.status);
      setEnabled(saved === "true" && permission.granted);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const toggleNotifications = async (nextValue: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("الإشعارات على الهاتف", "ثبّت نسخة التطبيق على Android أو iPhone لتفعيل إشعارات الحصص.");
      return;
    }
    setLoading(true);
    try {
      if (!nextValue) {
        await cancelLessonReminders();
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");
        setEnabled(false);
        return;
      }
      const permission = await requestLessonNotificationPermission();
      setPermissionStatus(permission.status);
      if (!permission.granted) {
        setEnabled(false);
        Alert.alert("لم يتم تفعيل الإشعارات", "اسمح لتطبيق DAFTAR بالإشعارات من إعدادات الهاتف حتى يصلك تذكير حصص اليوم.");
        return;
      }
      await scheduleLessonReminders(state.groups);
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");
      setEnabled(true);
    } catch {
      setEnabled(false);
      Alert.alert("تعذر تفعيل الإشعارات", "حاول مرة أخرى، وتأكد من أن صلاحية الإشعارات مفعّلة في إعدادات الهاتف.");
    } finally {
      setLoading(false);
    }
  };

  const subtitle = Platform.OS === "web"
    ? "تتوفر إشعارات الحصص في نسخة الهاتف المثبتة"
    : enabled
      ? `تذكير يومي الساعة ${lessonReminderTimeLabel} حسب جدول أفواجك`
      : permissionStatus === "denied"
        ? "الصلاحية مرفوضة — فعّلها من إعدادات الهاتف"
        : "احصل على تنبيه عندما تكون لديك حصص اليوم";

  return <View style={{ marginBottom: 25 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>إشعارات الحصص</Text><MaterialIcons name="notifications-none" size={21} color={colors.primary} /></View><View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={enabled ? "notifications-active" : "notifications-none"} size={19} color={colors.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "800", textAlign: "right" }}>تذكير حصص اليوم</Text><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }}>{subtitle}</Text></View><Switch value={enabled} onValueChange={toggleNotifications} disabled={loading || Platform.OS === "web"} trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.background} /></View><Text style={{ color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "right", paddingBottom: 13 }}>عند التفعيل سيطلب التطبيق إذن الإشعارات، ثم يرسل تنبيهًا محليًا فقط ولا يشارك بياناتك مع أي جهة.</Text></View></View>;
}
