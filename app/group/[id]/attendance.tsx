import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Avatar, EmptyState, IconButton, PrimaryButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { type AttendanceStatus, useDaftar } from "@/lib/daftar-store";

export default function AttendanceScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, getGroup, addSession } = useDaftar();
  const group = getGroup(id ?? "");
  const students = state.students.filter((student) => student.groupId === id && student.active);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>(() => Object.fromEntries(students.map((student) => [student.id, "present"])));
  if (!group) return <ScreenContainer><EmptyState title="الفوج غير موجود" action="العودة" onAction={() => router.back()} /></ScreenContainer>;
  const save = () => { if (!students.length) { Alert.alert("لا يوجد تلاميذ", "أضف تلاميذ إلى الفوج قبل تسجيل الحضور."); return; } addSession(group.id, draft); router.back(); };
  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="إلغاء" /><View style={{ flex: 1, marginHorizontal: 12 }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>حصة جديدة</Text><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "900", textAlign: "right" }}>تسجيل الحضور</Text></View><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="how-to-reg" size={22} color={colors.success} /></View></View><View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 16, marginBottom: 16 }}><Text style={{ color: "#C5D4E4", fontSize: 11, textAlign: "right" }}>{group.name}</Text><Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right", marginTop: 4 }}>{new Date().toLocaleDateString("ar-DZ", { day: "numeric", month: "long" })}</Text></View>{students.map((student) => { const present = draft[student.id] !== "absent"; return <Pressable key={student.id} onPress={() => setDraft((current) => ({ ...current, [student.id]: present ? "absent" : "present" }))} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: present ? colors.border : colors.errorSurface, opacity: pressed ? 0.75 : 1 })}><View style={{ flex: 1, alignItems: "flex-end" }}><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>{student.name}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{present ? "+1 حصة مستحقة" : "لا تضاف حصة"}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Text style={{ color: present ? colors.success : colors.error, fontWeight: "900" }}>{present ? "حاضر" : "غائب"}</Text><MaterialIcons name={present ? "check-circle" : "cancel"} size={24} color={present ? colors.success : colors.error} /><Avatar name={student.name} size={40} /></View></Pressable>; })}<PrimaryButton title="تأكيد الحضور" icon="check" onPress={save} /></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
