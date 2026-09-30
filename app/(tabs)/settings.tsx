import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ScreenContainer } from "@/components/screen-container";
import Constants from "expo-constants";
import { ReleaseAvailabilityCard } from "@/components/release-notice";
import { LocalAppStatus } from "@/components/local-app-status";
import { AppLogo, Avatar, ConfirmDialog, Field, ModalShell, PrimaryButton, SectionTitle } from "@/components/daftar-ui";
import { SecuritySettings } from "@/components/security-settings";
import { LessonNotificationSettings } from "@/components/lesson-notification-settings";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { recordSuccessfulBackup } from "@/lib/backup-reminder";
import { BACKUP_SCHEMA_VERSION, useDaftar } from "@/lib/daftar-store";
import { decryptBackup, encryptBackup } from "@/lib/backup";
import { useSecurity } from "@/lib/security";

type BackupMode = "export" | "import" | null;

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { state, updateProfile, exportData, restoreData, resetData } = useDaftar();
  const security = useSecurity();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(state.profile.name);
  const [profileSubject, setProfileSubject] = useState(state.profile.subject);
  const [profilePhone, setProfilePhone] = useState(state.profile.phone);
  const [backupMode, setBackupMode] = useState<BackupMode>(null);
  const [backupPin, setBackupPin] = useState("");
  const [backupError, setBackupError] = useState("");
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const saveProfile = () => { if (!profileName.trim() || !profileSubject.trim()) { Alert.alert("بيانات ناقصة", "أدخل الاسم والمادة."); return; } updateProfile({ ...state.profile, name: profileName.trim(), subject: profileSubject.trim(), phone: profilePhone.trim() }); setShowProfileModal(false); };
  const openBackup = (mode: Exclude<BackupMode, null>) => { if (!security.pinEnabled) { Alert.alert("فعّل PIN أولًا", "النسخ الاحتياطية مشفّرة ولا يمكن تصديرها أو استعادتها قبل تفعيل رمز PIN."); return; } setBackupPin(""); setBackupError(""); setBackupMode(mode); };
  const startImport = async () => { try { const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true }); if (result.canceled) return; const raw = Platform.OS === "web" ? await (await fetch(result.assets[0].uri)).text() : await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 }); setPendingImport(raw); openBackup("import"); } catch { Alert.alert("تعذر فتح الملف", "اختر ملف DAFTAR مشفّرًا بصيغة JSON."); } };
  const closeBackup = () => { setBackupMode(null); setPendingImport(null); setBackupPin(""); setBackupError(""); };
  const submitBackup = async () => {
    const verified = await security.verifyPin(backupPin);
    if (!verified.ok) { setBackupError(verified.message ?? "رمز PIN غير صحيح."); return; }
    try {
      if (backupMode === "export") {
        const payload = encryptBackup(exportData(), backupPin);
        const filename = `DAFTAR_Encrypted_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        if (Platform.OS === "web") { const blob = new Blob([payload], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
        else { const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`; await FileSystem.writeAsStringAsync(uri, payload, { encoding: FileSystem.EncodingType.UTF8 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "نسخة DAFTAR المشفّرة" }); }
        await recordSuccessfulBackup();
        closeBackup(); Alert.alert("تم التصدير", "تم إنشاء نسخة مشفّرة. استخدم رمز PIN نفسه لاستعادتها.");
      } else if (backupMode === "import" && pendingImport) {
        const restored = decryptBackup(pendingImport, backupPin);
        restoreData(restored); closeBackup(); Alert.alert("تمت الاستعادة", "تم التحقق من النسخة وفك تشفيرها واستعادتها بالكامل.");
      }
    } catch { setBackupError("الملف غير صالح أو رمز PIN غير صحيح. لم يتم تغيير بياناتك."); }
  };
  const confirmReset = () => setShowResetConfirm(true);

  const settingRow = (icon: React.ComponentProps<typeof MaterialIcons>["name"], title: string, subtitle: string, onPress: () => void, danger = false) => <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, opacity: pressed ? 0.7 : 1 })}><MaterialIcons name="chevron-left" size={20} color={colors.muted} /><View style={{ flex: 1, gap: 3 }}><Text style={{ color: danger ? colors.error : colors.foreground, textAlign: "right", fontSize: 14, fontWeight: "800" }}>{title}</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 11 }}>{subtitle}</Text></View><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: danger ? colors.errorSurface : colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={19} color={danger ? colors.error : colors.primary} /></View></Pressable>;

  return <ScreenContainer edges={["top", "left", "right"]}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><Text style={{ color: colors.foreground, fontSize: 25, fontWeight: "900", textAlign: "right" }}>الإعدادات</Text><AppLogo compact /></View><Pressable onPress={() => { setProfileName(state.profile.name); setProfileSubject(state.profile.subject); setProfilePhone(state.profile.phone); setShowProfileModal(true); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1, marginBottom: 26 })}><MaterialIcons name="chevron-left" size={21} color={colors.muted} /><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "right" }}>{state.profile.name || "أكمل ملفك الشخصي"}</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: "right" }}>{state.profile.subject || "أضف المادة ورقم الهاتف"}</Text></View><Avatar name={state.profile.name || "أستاذ"} size={48} /></Pressable><SectionTitle title="المظهر" /><View style={{ flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 5, marginBottom: 25 }}><Pressable onPress={() => setColorScheme("dark")} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colorScheme === "dark" ? colors.primary : "transparent" }}><Text style={{ color: colorScheme === "dark" ? colors.background : colors.muted, fontWeight: "800", fontSize: 13 }}>داكن</Text></Pressable><Pressable onPress={() => setColorScheme("light")} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colorScheme === "light" ? colors.primary : "transparent" }}><Text style={{ color: colorScheme === "light" ? colors.background : colors.muted, fontWeight: "800", fontSize: 13 }}>فاتح</Text></Pressable></View><SectionTitle title="البيانات" /><View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 25 }}>{settingRow("file-download", "تصدير نسخة مشفّرة", "حفظ نسخة محمية برمز PIN · schema v" + BACKUP_SCHEMA_VERSION, () => openBackup("export"))}{settingRow("file-upload", "استعادة نسخة مشفّرة", "التحقق وفك التشفير قبل أي تغيير", startImport)}{settingRow("archive", "الأرشيف", "استرجاع الأفواج والطلاب والمصاريف المؤرشفة", () => router.push("/archive" as never))}</View><SecuritySettings /><LessonNotificationSettings /><SectionTitle title="حول التطبيق" /><View style={{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 13, marginBottom: 24 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 12 }}>الإصدار {Constants.expoConfig?.version ?? "—"}</Text><Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "900" }}>DAFTAR</Text></View><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }}>دفتر الأستاذ الشخصي لإدارة الدروس، مبني ليعمل معك بسرعة حتى بدون إنترنت.</Text></View><LocalAppStatus /><ReleaseAvailabilityCard /><Pressable onPress={confirmReset} style={({ pressed }) => ({ alignItems: "center", padding: 14, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.error, fontSize: 12, fontWeight: "900" }}>حذف جميع البيانات</Text></Pressable><ModalShell presentation="center" visible={showProfileModal} title="الملف الشخصي" onClose={() => setShowProfileModal(false)}><View style={{ gap: 14 }}><Field label="الاسم الكامل" value={profileName} onChangeText={setProfileName} /><Field label="المادة" value={profileSubject} onChangeText={setProfileSubject} /><Field label="رقم الهاتف (اختياري)" value={profilePhone} onChangeText={setProfilePhone} keyboardType="phone-pad" /><PrimaryButton title="حفظ التغييرات" icon="check" onPress={saveProfile} /></View></ModalShell><ModalShell presentation="center" visible={Boolean(backupMode)} title={backupMode === "export" ? "تصدير نسخة مشفّرة" : "فك تشفير النسخة"} onClose={closeBackup}><View style={{ gap: 14 }}><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "right" }}>أدخل رمز PIN الحالي المكوّن من 6 أرقام. لن يتم حفظه أو تضمينه في الملف.</Text><Field label="رمز PIN من 6 أرقام" value={backupPin} onChangeText={(value) => { setBackupPin(value.replace(/\D/g, "").slice(0, 6)); setBackupError(""); }} secureTextEntry keyboardType="number-pad" placeholder="••••••" maxLength={6} /><Text style={{ color: colors.muted, fontSize: 11, textAlign: "right" }}>التشفير: XChaCha20-Poly1305 · PBKDF2-SHA256</Text>{backupError ? <Text style={{ color: colors.error, fontSize: 12, textAlign: "right" }}>{backupError}</Text> : null}<PrimaryButton title={backupMode === "export" ? "إنشاء النسخة" : "التحقق والاستعادة"} icon={backupMode === "export" ? "file-download" : "lock-open"} onPress={submitBackup} disabled={backupPin.length !== 6} /></View></ModalShell><ConfirmDialog visible={showResetConfirm} title="حذف جميع البيانات؟" message="سيتم حذف كل الأفواج والتلاميذ والحضور والمدفوعات والمصاريف نهائيًا من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء." confirmLabel="حذف نهائي" onClose={() => setShowResetConfirm(false)} onConfirm={() => { resetData(); setShowResetConfirm(false); }} /></ScrollView></ScreenContainer>;
}
