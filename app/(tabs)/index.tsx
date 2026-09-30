import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { ReleaseNoticeBanner } from "@/components/release-notice";
import { AppLogo, Avatar, Badge, EmptyState, Field, IconButton, ModalShell, PrimaryButton, SectionTitle } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { getLastSuccessfulBackup, isBackupReminderDue } from "@/lib/backup-reminder";
import { scheduleDays, useDaftar } from "@/lib/daftar-store";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, getStudentStats, updateProfile } = useDaftar();
  const [search, setSearch] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(!state.onboardingComplete);
  const [profileName, setProfileName] = useState(state.profile.name);
  const [profileSubject, setProfileSubject] = useState(state.profile.subject);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("daftar-welcome-hidden-v1").then((stored) => {
      if (stored === "1") setShowWelcome(false);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (state.onboardingComplete) setShowProfileModal(false);
    setProfileName(state.profile.name);
    setProfileSubject(state.profile.subject);
  }, [state.onboardingComplete, state.profile.name, state.profile.subject]);

  useEffect(() => {
    let active = true;
    const hasUserData = state.students.length > 0 || state.payments.length > 0;
    void getLastSuccessfulBackup()
      .then((lastBackup) => {
        if (active) {
          setShowBackupReminder(isBackupReminderDue(lastBackup, hasUserData));
        }
      })
      .catch(() => {
        if (active) setShowBackupReminder(false);
      });
    return () => {
      active = false;
    };
  }, [state.payments.length, state.students.length]);

  const activeStudents = state.students.filter((student) => student.active);
  const activeGroups = state.groups.filter((group) => group.active);
  const query = search.trim().toLocaleLowerCase();
  const todayIndex = new Date().getDay();
  const todaysGroups = useMemo(() => activeGroups.filter((group) => scheduleDays(group.schedule, group.days).includes(todayIndex)), [activeGroups, todayIndex]);
  const filteredGroups = useMemo(() => activeGroups.filter((group) => group.name.toLocaleLowerCase().includes(query)), [query, activeGroups]);
  const matchingStudents = useMemo(() => query ? activeStudents.filter((student) => `${student.name} ${student.phone}`.toLocaleLowerCase().includes(query)) : [], [activeStudents, query]);

  const submitProfile = () => {
    if (!profileName.trim() || !profileSubject.trim()) {
      Alert.alert("أكمل ملفك", "أدخل الاسم والمادة للبدء.");
      return;
    }
    updateProfile({ ...state.profile, name: profileName.trim(), subject: profileSubject.trim() });
    setShowProfileModal(false);
  };

  const hideWelcomeForever = async () => {
    setShowWelcome(false);
    await AsyncStorage.setItem("daftar-welcome-hidden-v1", "1").catch(() => undefined);
  };

  const renderGroup = ({ item }: { item: typeof state.groups[number] }) => {
    const students = activeStudents.filter((student) => student.groupId === item.id);
    const debtCount = students.filter((student) => getStudentStats(student.id).balance > 0).length;
    return <Pressable onPress={() => router.push(`/group/${item.id}`)} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: 22, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1, transform: [{ translateY: pressed ? 1 : 0 }] }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 5, alignSelf: "stretch", borderRadius: 4, backgroundColor: item.accent }} /><View style={{ flex: 1, gap: 8 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><MaterialIcons name="chevron-left" size={21} color={colors.muted} /><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "right", flex: 1 }} numberOfLines={1}>{item.name}</Text></View><View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}><Text style={{ color: colors.muted, fontSize: 12 }}><MaterialIcons name="groups" size={13} color={colors.muted} /> {students.length} تلميذ</Text><Text style={{ color: colors.muted, fontSize: 12 }}><MaterialIcons name="event" size={13} color={colors.muted} /> {item.schedule}</Text></View><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Badge label={debtCount > 0 ? `${debtCount} مديون` : "متوازن"} tone={debtCount > 0 ? "warning" : "success"} /><Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>{item.referenceLessons} حصص · {Math.round(item.price).toLocaleString("fr-FR")} دج</Text></View></View></View>
    </Pressable>;
  };

  return <ScreenContainer edges={["top", "left", "right"]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><FlatList data={filteredGroups} keyExtractor={(item) => item.id} renderItem={renderGroup} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 }} ListHeaderComponent={<View>
    <ReleaseNoticeBanner />
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 23 }}><IconButton icon="settings" onPress={() => router.push("/settings")} label="الإعدادات" /><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View><Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>اليوم · {new Date().toLocaleDateString("ar-DZ", { day: "numeric", month: "short" })}</Text><Text style={{ color: colors.foreground, fontSize: 19, fontWeight: "900", textAlign: "right", marginTop: 3 }}>مرحبًا، {state.profile.name || "أستاذ"} 👋</Text></View><Avatar name={state.profile.name || "أستاذ"} size={46}  /></View></View>
    {showBackupReminder ? <View style={{ backgroundColor: colors.warningSurface, borderRadius: 18, padding: 15, marginBottom: 16, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10 }}><MaterialIcons name="backup" size={21} color={colors.warning} /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "900", textAlign: "right" }}>احمِ بياناتك بنسخة احتياطية</Text><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "right" }}>لم تنشئ نسخة مشفّرة خلال 14 يومًا. احتفظ بها خارج الهاتف.</Text><Pressable onPress={() => router.push("/settings" as never)} style={{ alignSelf: "flex-end", paddingTop: 3 }}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900" }}>الذهاب إلى النسخ الاحتياطي</Text></Pressable></View><Pressable onPress={() => setShowBackupReminder(false)} accessibilityLabel="إغلاق تذكير النسخة الاحتياطية" style={{ padding: 4 }}><MaterialIcons name="close" size={18} color={colors.muted} /></Pressable></View> : null}
    {showWelcome ? <View style={{ backgroundColor: colors.infoSurface, borderRadius: 19, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, gap: 11 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="waving-hand" size={18} color={colors.primary} /></View><Text style={{ color: colors.foreground, flex: 1, fontSize: 15, fontWeight: "900", textAlign: "right" }}>مرحبًا بالأستاذ</Text></View><Pressable onPress={() => setShowWelcome(false)} accessibilityLabel="إغلاق رسالة الترحيب" style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}><MaterialIcons name="close" size={18} color={colors.muted} /></Pressable></View><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: "right" }}>إليك هذا التطبيق لمساعدتك على إدارة دروسك الخصوصية بدل الأوراق.</Text><Pressable onPress={hideWelcomeForever} style={({ pressed }) => ({ alignSelf: "flex-end", paddingVertical: 4, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>عدم الإظهار مرة أخرى</Text></Pressable></View> : null}
    <Pressable onPress={() => router.push("/today" as never)} style={({ pressed }) => ({ backgroundColor: todaysGroups.length ? colors.successSurface : colors.surface, borderRadius: 17, padding: 15, marginBottom: 18, borderWidth: 1, borderColor: todaysGroups.length ? colors.border : colors.border, opacity: pressed ? 0.78 : 1, flexDirection: "row", alignItems: "center", gap: 10 })}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: todaysGroups.length ? colors.success : colors.muted }} /><View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900", textAlign: "right" }}>{todaysGroups.length ? `حصص اليوم · ${todaysGroups.length}` : "لا توجد حصص اليوم"}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right", marginTop: 3 }}>{todaysGroups.length ? "اضغط لعرض جدول اليوم" : "يمكنك مراجعة الأفواج أو تعديل جدولها"}</Text></View><MaterialIcons name="chevron-left" size={20} color={colors.muted} /></Pressable>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 13, minHeight: 49, marginBottom: 20 }}><MaterialIcons name="search" size={21} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن فوج أو تلميذ أو رقم الهاتف" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.foreground, textAlign: "right", fontSize: 14 }} /></View>
    {query && matchingStudents.length > 0 && <View style={{ backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 17, gap: 10 }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", textAlign: "right" }}>نتائج التلاميذ</Text>{matchingStudents.slice(0, 6).map((student) => <Pressable key={student.id} onPress={() => router.push(`/student/${student.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><MaterialIcons name="chevron-left" size={18} color={colors.muted} /><View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: "800", textAlign: "right" }}>{student.name}</Text><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>{state.groups.find((group) => group.id === student.groupId)?.name}</Text></View><Avatar name={student.name} size={34} /></Pressable>)}</View>}
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><SectionTitle title="أفواجك" /><Pressable onPress={() => router.push("/group/new" as never)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1 })}><MaterialIcons name="add-circle" size={20} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }}>إضافة فوج</Text></Pressable></View>
  </View>} ListEmptyComponent={<EmptyState icon="groups" title={query ? "لم نجد نتائج" : "لا توجد أفواج بعد"} subtitle={query ? "جرّب اسمًا مختلفًا أو رقم الهاتف." : "ابدأ بتنظيم أول فوج لك في أقل من دقيقة."} action={!query ? "+ إضافة فوج جديد" : undefined} onAction={!query ? () => router.push("/group/new" as never) : undefined} />} />
    <ModalShell presentation="center" visible={showProfileModal} title="مرحبًا بك في DAFTAR" onClose={() => state.onboardingComplete && setShowProfileModal(false)}><View style={{ gap: 14 }}><View style={{ alignItems: "center", gap: 8, paddingBottom: 6 }}><AppLogo /><Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 19 }}>دفترك الرقمي لإدارة أفواجك وتلاميذك وحضورهم ومدفوعاتهم.</Text></View><Field label="اسمك الكامل" value={profileName} onChangeText={setProfileName} placeholder="الأستاذ" /><Field label="المادة" value={profileSubject} onChangeText={setProfileSubject} placeholder="الرياضيات" /><PrimaryButton title="ابدأ الآن" icon="arrow-forward" onPress={submitProfile} /></View></ModalShell>
  </KeyboardAvoidingView></ScreenContainer>;
}
