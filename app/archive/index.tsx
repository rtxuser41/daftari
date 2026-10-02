import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Avatar, EmptyState, IconButton, SectionTitle } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { formatDate, formatDzd, useDaftar, type Expense, type Group, type Student } from "@/lib/daftar-store";

type ArchiveTab = "groups" | "students" | "expenses";
type ArchiveRow = Group | Student | Expense;

export default function ArchiveScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, getGroup, restoreGroup, restoreStudent, restoreExpense } = useDaftar();
  const [tab, setTab] = useState<ArchiveTab>("groups");
  const archivedGroups = useMemo(() => state.groups.filter((group) => !group.active), [state.groups]);
  const archivedStudents = useMemo(() => state.students.filter((student) => !student.active), [state.students]);
  const archivedExpenses = useMemo(() => state.expenses.filter((expense) => !expense.active), [state.expenses]);
  const rows: ArchiveRow[] = tab === "groups" ? archivedGroups : tab === "students" ? archivedStudents : archivedExpenses;
  const tabs: { key: ArchiveTab; label: string; count: number; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
    { key: "groups", label: "الأفواج", count: archivedGroups.length, icon: "groups" },
    { key: "students", label: "الطلاب", count: archivedStudents.length, icon: "person" },
    { key: "expenses", label: "المصاريف", count: archivedExpenses.length, icon: "receipt-long" },
  ];

  const restore = (item: ArchiveRow) => {
    if (tab === "groups") restoreGroup((item as Group).id);
    else if (tab === "students") restoreStudent((item as Student).id);
    else restoreExpense((item as Expense).id);
  };

  const renderArchivedItem = ({ item }: { item: ArchiveRow }) => {
    const group = "groupId" in item ? getGroup(item.groupId ?? "") : undefined;
    let title = "";
    let subtitle = "";
    if (tab === "groups") {
      const groupItem = item as Group;
      title = groupItem.name;
      subtitle = `${groupItem.referenceLessons} حصص · ${groupItem.schedule}`;
    } else if (tab === "students") {
      const studentItem = item as Student;
      title = studentItem.name;
      subtitle = group?.name ?? "فوج غير معروف";
    } else {
      const expenseItem = item as Expense;
      title = expenseItem.description;
      subtitle = `${expenseItem.category} · ${formatDate(expenseItem.date)}${group ? ` · ${group.name}` : " · عام"}`;
    }
    return <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}><Pressable onPress={() => tab === "groups" ? router.push((`/group/${item.id}`) as never) : undefined} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 11, opacity: pressed ? 0.75 : 1 })}>{tab === "students" ? <Avatar name={title} size={42} /> : <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tab === "expenses" ? colors.errorSurface : colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={tab === "expenses" ? "receipt-long" : "groups"} size={20} color={tab === "expenses" ? colors.error : colors.primary} /></View>}<View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900", textAlign: "right" }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>{subtitle}</Text>{tab === "expenses" ? <Text style={{ color: colors.error, fontSize: 12, fontWeight: "900", textAlign: "right" }}>−{formatDzd((item as Expense).amount)}</Text> : null}</View></Pressable><Pressable onPress={() => restore(item)} style={({ pressed }) => ({ minWidth: 80, minHeight: 42, paddingHorizontal: 10, borderRadius: 13, backgroundColor: colors.successSurface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1, flexDirection: "row", gap: 4 })}><MaterialIcons name="restore" size={17} color={colors.success} /><Text style={{ color: colors.success, fontSize: 11, fontWeight: "900" }}>استرجاع</Text></Pressable></View>;
  };

  return <ScreenContainer edges={["top", "left", "right"]}><View style={{ flex: 1 }}><FlatList data={rows} keyExtractor={(item) => item.id} renderItem={renderArchivedItem} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 32 }} ListHeaderComponent={<View><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}><IconButton icon="arrow-forward" onPress={() => router.back()} label="العودة" /><View style={{ flex: 1, marginHorizontal: 12 }}><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>استرجاع آمن</Text><Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "900", textAlign: "right", marginTop: 3 }}>الأرشيف</Text></View><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="inventory-2" size={22} color={colors.primary} /></View></View><View style={{ backgroundColor: colors.infoSurface, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}><MaterialIcons name="info-outline" size={20} color={colors.primary} /><Text style={{ color: colors.foreground, flex: 1, fontSize: 12, lineHeight: 19, textAlign: "right" }}>الأرشفة لا تحذف البيانات. يمكنك استرجاع أي عنصر ليظهر مجددًا في التقارير والقوائم.</Text></View><View style={{ flexDirection: "row", gap: 7, backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 5, marginBottom: 22 }}>{tabs.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={({ pressed }) => ({ flex: 1, minHeight: 54, borderRadius: 13, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: tab === item.key ? colors.primary : "transparent", opacity: pressed ? 0.75 : 1 })}><MaterialIcons name={item.icon} size={18} color={tab === item.key ? colors.background : colors.muted} /><Text style={{ color: tab === item.key ? colors.background : colors.muted, fontSize: 10, fontWeight: "900" }}>{item.label} · {item.count}</Text></Pressable>)}</View><SectionTitle title={tab === "groups" ? "الأفواج المؤرشفة" : tab === "students" ? "الطلاب المؤرشفون" : "المصاريف المؤرشفة"} /></View>} ListEmptyComponent={<EmptyState icon="inventory-2" title="الأرشيف فارغ" subtitle="العناصر التي تؤرشفها ستظهر هنا ويمكن استرجاعها في أي وقت." />} /></View></ScreenContainer>;
}
