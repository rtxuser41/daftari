import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState, IconButton } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { scheduleDays, useDaftar } from "@/lib/daftar-store";

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useDaftar();
  const today = new Date().getDay();
  const groups = useMemo(() => state.groups.filter((group) => group.active && scheduleDays(group.schedule, group.days).includes(today)), [state.groups, today]);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 32, flexGrow: groups.length ? undefined : 1 }}
        ListHeaderComponent={<View style={{ marginBottom: 18 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="العودة" /><View style={{ flex: 1, marginHorizontal: 12 }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>جدول اليوم</Text><Text style={{ color: colors.foreground, fontSize: 23, fontWeight: "900", textAlign: "right", marginTop: 3 }}>حصص اليوم</Text></View><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="today" size={22} color={colors.success} /></View></View><View style={{ backgroundColor: colors.successSurface, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} /><Text style={{ color: colors.foreground, fontWeight: "800", textAlign: "right", flex: 1 }}>{dayNames[today]} · {groups.length ? `${groups.length} حصص مجدولة` : "لا توجد حصص اليوم"}</Text></View></View>}
        renderItem={({ item }) => <Pressable onPress={() => router.push(`/group/${item.id}`)} style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: 20, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.78 : 1, flexDirection: "row", alignItems: "center", gap: 12 })}><View style={{ width: 6, alignSelf: "stretch", borderRadius: 3, backgroundColor: item.accent }} /><View style={{ flex: 1, gap: 7 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "right" }}>{item.name}</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{item.schedule}</Text><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800", textAlign: "right" }}>فتح سجل الحضور للفوج</Text></View><MaterialIcons name="chevron-left" size={22} color={colors.muted} /></Pressable>}
        ListEmptyComponent={<View style={{ flex: 1, justifyContent: "center" }}><EmptyState icon="event-busy" title="لا توجد حصص اليوم" subtitle="لم يتم العثور على فوج نشط في جدول هذا اليوم." action="العودة إلى الرئيسية" onAction={() => router.back()} /></View>}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}
