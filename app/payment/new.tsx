import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Field, IconButton, PrimaryButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { formatDzd, useDaftar } from "@/lib/daftar-store";

export default function NewPaymentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { groupId, studentId } = useLocalSearchParams<{ groupId: string; studentId: string }>();
  const { getGroup, getStudent, getStudentStats, addPayment } = useDaftar();
  const group = getGroup(groupId ?? "");
  const student = getStudent(studentId ?? "");
  const stats = student ? getStudentStats(student.id) : undefined;
  const [lessons, setLessons] = useState(group?.referenceLessons.toString() ?? "4");
  const [amount, setAmount] = useState(stats?.effectivePrice.toString() ?? group?.price.toString() ?? "");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (group) setLessons(group.referenceLessons.toString());
    if (stats) setAmount(stats.effectivePrice.toString());
  }, [group, stats]);
  if (!group || !student) return <ScreenContainer><View style={{ flex: 1, justifyContent: "center", padding: 24 }}><Text style={{ color: colors.foreground, textAlign: "center" }}>بيانات الدفع غير موجودة.</Text></View></ScreenContainer>;
  const save = () => { const numericLessons = Number(lessons); const numericAmount = Number(amount); if (!Number.isInteger(numericLessons) || numericLessons <= 0 || !Number.isFinite(numericAmount) || numericAmount <= 0) { Alert.alert("بيانات غير صحيحة", "أدخل عدد حصص ومبلغًا صحيحين."); return; } addPayment({ groupId: group.id, studentId: student.id, lessons: numericLessons, amount: numericAmount, note: note.trim(), pricePerLesson: numericAmount / numericLessons }); router.back(); };
  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 18 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="إلغاء" /><Text style={{ color: colors.foreground, fontSize: 23, fontWeight: "900" }}>تسجيل دفعة</Text><View style={{ width: 42 }} /></View><View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>التلميذ</Text><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900", textAlign: "right", marginTop: 4 }}>{student.name}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 4 }}>السعر الفعلي الحالي: {formatDzd(stats?.effectivePrice ?? group.price)}</Text></View><View style={{ flexDirection: "row", gap: 10 }}><Field label="عدد الحصص" value={lessons} onChangeText={setLessons} keyboardType="numeric" style={{ flex: 1 }} /><Field label="المبلغ (دج)" value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ flex: 1 }} /></View><Field label="ملاحظة (اختياري)" value={note} onChangeText={setNote} placeholder="اشتراك سبتمبر" /><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }}>يتم حفظ المبلغ الفعلي وسعر الحصة وقت الدفع، لذلك لا تتأثر هذه العملية بتغييرات الأسعار المستقبلية.</Text><PrimaryButton title="تأكيد الدفع" icon="check" onPress={save} /></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
