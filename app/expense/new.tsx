import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Field, IconButton, PrimaryButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { useDaftar } from "@/lib/daftar-store";

export default function NewExpenseScreen() {
  const colors = useColors();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { addExpense } = useDaftar();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("مستلزمات");
  const save = () => { const numericAmount = Number(amount); if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !description.trim() || !category.trim()) { Alert.alert("بيانات غير صحيحة", "أدخل مبلغًا ووصفًا وفئة للمصروف."); return; } addExpense({ groupId: groupId || undefined, amount: numericAmount, description: description.trim(), category: category.trim() }); router.back(); };
  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 18 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="إلغاء" /><Text style={{ color: colors.foreground, fontSize: 23, fontWeight: "900" }}>إضافة مصروف</Text><View style={{ width: 42 }} /></View><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 20 }}>سجّل المصروف مرة واحدة. يظهر في التقارير فورًا ويمكن أرشفته لاحقًا مع الاحتفاظ بسجله.</Text><Field label="المبلغ (دج)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="500" autoFocus /><Field label="الوصف" value={description} onChangeText={setDescription} placeholder="طباعة أوراق التمارين" /><Field label="الفئة" value={category} onChangeText={setCategory} placeholder="مستلزمات" /><PrimaryButton title="حفظ المصروف" icon="check" onPress={save} /></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
