import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { Badge, ConfirmDialog, EmptyState, Field, IconButton, ModalShell, PrimaryButton, SectionTitle, StatCard } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { formatDate, formatDzd, getMonthKey, getMonthlyFinanceStats, useDaftar } from "@/lib/daftar-store";

function monthLabel(monthDate: Date) {
  return monthDate.toLocaleDateString("ar-DZ", { month: "long", year: "numeric" });
}

export default function FinanceScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, getGroup, getStudentStats, archiveExpense, deleteExpense, updateExpense } = useDaftar();
  const activeStudents = state.students.filter((student) => student.active);
  const collected = state.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const debt = activeStudents.reduce((sum, student) => sum + getStudentStats(student.id).debtAmount, 0);
  const activeExpenses = state.expenses.filter((expense) => expense.active);
  const expenses = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const net = collected - expenses;
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"archive" | "delete" | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const editingExpense = editingId ? state.expenses.find((expense) => expense.id === editingId) : undefined;
  const selectedMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1), [monthOffset]);
  const selectedMonthKey = getMonthKey(selectedMonth);
  const monthly = useMemo(() => getMonthlyFinanceStats(state, selectedMonthKey), [selectedMonthKey, state]);
  const groupsWithStats = useMemo(() => state.groups.filter((group) => group.active).map((group) => {
    const groupPayments = state.payments.filter((payment) => payment.groupId === group.id).reduce((sum, payment) => sum + payment.amount, 0);
    const groupStudents = activeStudents.filter((student) => student.groupId === group.id);
    const groupDebt = groupStudents.reduce((sum, student) => sum + getStudentStats(student.id).debtAmount, 0);
    return { group, groupPayments, groupDebt, studentCount: groupStudents.length };
  }), [activeStudents, getStudentStats, state.groups, state.payments]);

  const openEdit = (expense: typeof state.expenses[number]) => {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setDescription(expense.description);
    setCategory(expense.category);
  };
  const saveEdit = () => {
    const numericAmount = Number(amount);
    if (!editingExpense || !Number.isFinite(numericAmount) || numericAmount <= 0 || !description.trim() || !category.trim()) return;
    updateExpense(editingExpense.id, { groupId: editingExpense.groupId, amount: numericAmount, description, category });
    setEditingId(null);
  };
  const completeConfirm = () => {
    if (!editingId) return;
    if (confirmMode === "delete") deleteExpense(editingId);
    else archiveExpense(editingId);
    setConfirmMode(null);
    setEditingId(null);
  };
  const askAction = (id: string, mode: "archive" | "delete") => { setEditingId(id); setConfirmMode(mode); };

  return <ScreenContainer edges={["top", "left", "right"]}>
    <FlatList
      data={activeExpenses}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 }}
      renderItem={({ item }) => <View style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: colors.border }}><Pressable onPress={() => openEdit(item)} onLongPress={() => askAction(item.id, "archive")} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.8 : 1 })}><View style={{ width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSurface }}><MaterialIcons name="receipt-long" size={19} color={colors.primary} /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800", textAlign: "right" }}>{item.description}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>{item.category} · {formatDate(item.date)}{item.groupId ? ` · ${getGroup(item.groupId)?.name ?? "فوج مؤرشف"}` : " · عام"}</Text></View><Text style={{ color: colors.error, fontSize: 13, fontWeight: "900" }}>−{formatDzd(item.amount)}</Text></Pressable><IconButton icon="delete-forever" onPress={() => askAction(item.id, "delete")} label="حذف المصروف نهائيًا" /></View>}
      ListHeaderComponent={<View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}><Text style={{ color: colors.foreground, fontSize: 25, fontWeight: "900", textAlign: "right" }}>المالية</Text><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="bar-chart" size={21} color={colors.primary} /></View></View>
        <View style={{ backgroundColor: colors.hero, borderRadius: 22, padding: 20, marginBottom: 14 }}><Text style={{ color: colors.heroMuted, fontSize: 12, textAlign: "right" }}>الصافي الحالي</Text><Text style={{ color: colors.heroForeground, fontSize: 31, fontWeight: "900", textAlign: "right", marginTop: 5 }}>{formatDzd(net)}</Text><View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}><View><Text style={{ color: colors.heroMuted, fontSize: 10, textAlign: "left" }}>المصاريف</Text><Text style={{ color: colors.heroNegative, fontWeight: "800", fontSize: 13, marginTop: 3, textAlign: "left" }}>− {formatDzd(expenses)}</Text></View><View><Text style={{ color: colors.heroMuted, fontSize: 10, textAlign: "right" }}>المداخيل</Text><Text style={{ color: colors.heroPositive, fontWeight: "800", fontSize: 13, marginTop: 3, textAlign: "right" }}>+ {formatDzd(collected)}</Text></View></View></View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}><StatCard label="المحصلة" value={collected} tone="success" /><StatCard label="الديون" value={debt} tone="warning" /></View>
        <View style={{ backgroundColor: colors.infoSurface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 24, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>إحصاءات شهرية</Text><MaterialIcons name="insights" size={21} color={colors.primary} /></View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: 14, padding: 5, borderWidth: 1, borderColor: colors.border }}><Pressable accessibilityLabel="الشهر السابق" onPress={() => setMonthOffset((value) => value - 1)} style={({ pressed }) => ({ width: 42, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSurface, opacity: pressed ? 0.7 : 1 })}><MaterialIcons name="chevron-left" size={22} color={colors.primary} /></Pressable><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900", textAlign: "center", flex: 1 }}>{monthLabel(selectedMonth)}</Text><Pressable accessibilityLabel="الشهر التالي" disabled={monthOffset >= 0} onPress={() => setMonthOffset((value) => Math.min(0, value + 1))} style={({ pressed }) => ({ width: 42, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: monthOffset >= 0 ? colors.surface : colors.accentSurface, opacity: monthOffset >= 0 ? 0.35 : pressed ? 0.7 : 1 })}><MaterialIcons name="chevron-right" size={22} color={colors.primary} /></Pressable></View>
          <View style={{ flexDirection: "row", gap: 9 }}><StatCard label="الدخل" value={monthly.income} tone="success" caption={`${monthly.payments} دفعة`} /><StatCard label="المصاريف" value={monthly.expenses} tone="warning" caption={`${monthly.expenseCount} عملية`} /></View>
          <View style={{ flexDirection: "row", gap: 9 }}><StatCard label="الصافي" value={monthly.net} tone="primary" caption={`${monthly.sessions} حصة`} /><StatCard label="الدروس المحصلة" value={`${monthly.lessonsPaid} درس`} tone="gold" caption="مدفوع" /></View>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }}>الأرقام محسوبة من العمليات المسجلة في الشهر المختار، ولا تشمل المصاريف المؤرشفة.</Text>
        </View>
        <SectionTitle title="ملخص الأفواج" /><View style={{ gap: 9, marginBottom: 24 }}>{groupsWithStats.map(({ group, groupPayments, groupDebt, studentCount }) => <View key={group.id} style={{ backgroundColor: colors.surface, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Badge label={`${studentCount} تلميذ`} /><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900", flex: 1, textAlign: "right" }}>{group.name}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: groupDebt > 0 ? colors.warning : colors.success, fontSize: 12, fontWeight: "800" }}>{groupDebt > 0 ? `ديون ${formatDzd(groupDebt)}` : "لا ديون مستحقة"}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>المحصلة {formatDzd(groupPayments)}</Text></View></View>)}</View><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><SectionTitle title="آخر المصاريف" /><Pressable onPress={() => router.push("/expense/new" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MaterialIcons name="add-circle" size={20} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>إضافة مصروف</Text></Pressable></View>
      </View>}
      ListEmptyComponent={<EmptyState icon="receipt-long" title="لا توجد مصاريف مسجلة" subtitle="سجّل مصاريفك لتعرف صافي الدخل الحقيقي." action="+ إضافة مصروف" onAction={() => router.push("/expense/new" as never)} />}
    />
    <ModalShell presentation="center" visible={Boolean(editingId && !confirmMode && editingExpense)} title="تعديل المصروف" onClose={() => setEditingId(null)}><View style={{ gap: 14 }}><Field label="المبلغ (دج)" value={amount} onChangeText={setAmount} keyboardType="numeric" /><Field label="الوصف" value={description} onChangeText={setDescription} /><Field label="الفئة" value={category} onChangeText={setCategory} /><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }}>تعديل المصروف يحدّث التقرير الحالي مع الاحتفاظ بتاريخ العملية.</Text><PrimaryButton title="حفظ التغييرات" icon="check" onPress={saveEdit} /></View></ModalShell>
    <ConfirmDialog visible={Boolean(confirmMode && editingExpense)} title={confirmMode === "delete" ? "حذف المصروف نهائيًا؟" : "أرشفة المصروف؟"} message={confirmMode === "delete" ? "سيُحذف المصروف من السجل والتقارير نهائيًا. لا يمكن التراجع عن هذا الإجراء." : "سيختفي المصروف من الإجماليات الحالية مع الاحتفاظ به في السجل المؤرشف."} confirmLabel={confirmMode === "delete" ? "حذف نهائي" : "أرشفة المصروف"} onClose={() => { setConfirmMode(null); setEditingId(null); }} onConfirm={completeConfirm} />
  </ScreenContainer>;
}
