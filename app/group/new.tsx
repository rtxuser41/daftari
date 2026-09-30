import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Field, IconButton, PrimaryButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { useDaftar } from "@/lib/daftar-store";

const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function NewGroupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addGroup } = useDaftar();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("2000");
  const [lessons, setLessons] = useState("4");
  const [schedule, setSchedule] = useState("الجمعة · 14:00 — 16:30");
  const [selectedDays, setSelectedDays] = useState<number[]>([5]);
  const save = () => {
    const numericPrice = Number(price);
    const numericLessons = Number(lessons);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isInteger(numericLessons) || numericLessons <= 0 || !selectedDays.length) {
      Alert.alert("بيانات غير صحيحة", "أدخل اسم الفوج والسعر وعدد الحصص واختر يومًا واحدًا على الأقل.");
      return;
    }
    addGroup({ name: name.trim(), price: numericPrice, referenceLessons: numericLessons, schedule: schedule.trim() || days[selectedDays[0]], days: selectedDays });
    router.back();
  };
  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 18 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="إلغاء" /><Text style={{ color: colors.foreground, fontSize: 23, fontWeight: "900" }}>إضافة فوج</Text><View style={{ width: 42 }} /></View><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 20 }}>أنشئ فوجًا جديدًا في صفحة كاملة قابلة للتمرير، ثم أضف التلاميذ وسجّل حضورهم.</Text><Field label="اسم الفوج" value={name} onChangeText={setName} placeholder="مثال: باكالوريا علوم تجريبية" autoFocus /><View style={{ flexDirection: "row", gap: 10 }}><Field label="السعر المرجعي (دج)" value={price} onChangeText={setPrice} keyboardType="numeric" style={{ flex: 1 }} /><Field label="عدد الحصص المرجعية" value={lessons} onChangeText={setLessons} keyboardType="numeric" style={{ flex: 1 }} /></View><Field label="وصف الموعد" value={schedule} onChangeText={setSchedule} placeholder="الجمعة · 14:00 — 16:30" /><View style={{ gap: 9 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800", textAlign: "right" }}>أيام الحصص</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>{days.map((day, index) => { const selected = selectedDays.includes(index); return <Pressable key={day} onPress={() => setSelectedDays((current) => selected ? current.filter((value) => value !== index) : [...current, index])} style={{ paddingHorizontal: 13, minHeight: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.primary : colors.surface, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}><Text style={{ color: selected ? colors.background : colors.foreground, fontWeight: "800", fontSize: 12 }}>{day}</Text></Pressable>; })}</View></View><View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 10 }}><MaterialIcons name="info-outline" size={20} color={colors.primary} /><Text style={{ color: colors.muted, flex: 1, textAlign: "right", fontSize: 12, lineHeight: 19 }}>السعر هنا هو السعر الافتراضي للفوج. يمكنك تخصيص سعر مختلف لكل تلميذ عند إضافته.</Text></View><PrimaryButton title="إنشاء الفوج" icon="check" onPress={save} /></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
