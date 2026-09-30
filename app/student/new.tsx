import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Field, IconButton, PrimaryButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { useDaftar } from "@/lib/daftar-store";

export default function NewStudentScreen() {
  const colors = useColors();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getGroup, addStudent } = useDaftar();
  const group = getGroup(groupId ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(group?.price.toString() ?? "");
  useEffect(() => {
    if (group) setPrice(group.price.toString());
  }, [group]);
  if (!group) return <ScreenContainer><View style={{ flex: 1, justifyContent: "center", padding: 24 }}><Text style={{ color: colors.foreground, textAlign: "center" }}>الفوج غير موجود.</Text></View></ScreenContainer>;
  const save = () => {
    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) { Alert.alert("بيانات غير صحيحة", "أدخل اسم التلميذ وسعرًا صحيحًا."); return; }
    addStudent({ groupId: group.id, name: name.trim(), phone: phone.trim(), customPrice: numericPrice === group.price ? null : numericPrice });
    router.back();
  };
  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 18 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="إلغاء" /><Text style={{ color: colors.foreground, fontSize: 23, fontWeight: "900" }}>إضافة تلميذ</Text><View style={{ width: 42 }} /></View><View style={{ backgroundColor: colors.surface, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>الفوج</Text><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "right", marginTop: 4 }}>{group.name}</Text></View><Field label="الاسم الكامل" value={name} onChangeText={setName} placeholder="أحمد محمد" autoFocus /><Field label="رقم الهاتف (اختياري)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0550 00 00 00" /><Field label="السعر المخصص (دج)" value={price} onChangeText={setPrice} keyboardType="numeric" /><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }}>يُملأ السعر تلقائيًا بسعر الفوج ({group.price.toLocaleString("fr-FR")} دج). غيّره فقط إذا كان لهذا التلميذ خصم أو سعر خاص.</Text><PrimaryButton title="حفظ التلميذ" icon="person-add" onPress={save} /></ScrollView></KeyboardAvoidingView></ScreenContainer>;
}
