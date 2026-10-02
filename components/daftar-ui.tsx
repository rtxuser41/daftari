import { useEffect, useRef } from "react";
import { Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { formatDzd } from "@/lib/daftar-store";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const markSize = compact ? 36 : 46;
  if (!compact) return <Image accessibilityLabel="شعار DAFTAR" source={require("@/assets/images/daftar-logo-user.png")} resizeMode="contain" style={{ width: 190, height: 132, alignSelf: "center" }} />;
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: markSize, height: markSize, borderRadius: 13, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border }}><Image source={require("@/assets/images/daftar-mark-user.png")} resizeMode="contain" style={{ width: markSize * 0.9, height: markSize * 0.9 }} /></View><View><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "900", letterSpacing: 1 }}>DAFTAR</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 1 }}>دفتر الأستاذ الذكي</Text></View></View>;
}

export function PrimaryButton({ title, onPress, icon = "add", disabled = false, style }: { title: string; onPress: () => void; icon?: React.ComponentProps<typeof MaterialIcons>["name"]; disabled?: boolean; style?: ViewStyle }) {
  const colors = useColors();
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [{ alignSelf: "stretch", backgroundColor: colors.primary, borderRadius: 16, minHeight: 52, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}><MaterialIcons name={icon} size={20} color={colors.background} /><Text style={{ color: colors.background, fontSize: 14, fontWeight: "800" }}>{title}</Text></Pressable>;
}

export function IconButton({ icon, onPress, label }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; onPress: () => void; label?: string }) {
  const colors = useColors();
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1, borderWidth: 1, borderColor: colors.border })}><MaterialIcons name={icon} size={22} color={colors.foreground} /></Pressable>;
}

export function Field({ label, style, ...props }: Omit<TextInputProps, "style"> & { label: string; style?: ViewStyle }) {
  const colors = useColors();
  return <View style={[{ alignSelf: "stretch", gap: 7 }, style]}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700", lineHeight: 19, textAlign: "right" }}>{label}</Text><TextInput {...props} placeholderTextColor={colors.muted} style={{ alignSelf: "stretch", minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, color: colors.foreground, fontSize: 15, textAlign: "right" }} /></View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "900" }}>{title}</Text>{action && <Pressable onPress={onAction}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{action}</Text></Pressable>}</View>;
}

export function StatCard({ label, value, tone = "primary", caption }: { label: string; value: string | number; tone?: "primary" | "gold" | "success" | "warning"; caption?: string }) {
  const colors = useColors();
  const bg = tone === "primary" ? colors.primary : tone === "gold" ? "#C5A059" : tone === "success" ? colors.success : colors.warning;
  const fg = tone === "warning" || tone === "gold" ? "#0B2545" : colors.background;
  return <View style={{ flex: 1, minHeight: 104, borderRadius: 18, backgroundColor: bg, padding: 14, justifyContent: "space-between" }}><Text style={{ color: fg, opacity: 0.78, fontSize: 11, fontWeight: "700", textAlign: "right" }}>{label}</Text><Text style={{ color: fg, fontSize: 20, fontWeight: "900", textAlign: "right" }}>{typeof value === "number" ? formatDzd(value) : value}</Text>{caption && <Text style={{ color: fg, opacity: 0.72, fontSize: 10, textAlign: "right" }}>{caption}</Text>}</View>;
}

export function Avatar({ name, size = 44, color }: { name: string; size?: number; color?: string }) {
  const colors = useColors();
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("");
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: color ?? colors.accentSurface }}><Text style={{ color: colors.primary, fontWeight: "900", fontSize: size * 0.32 }}>{initials}</Text></View>;
}

export function EmptyState({ icon = "inbox", title, subtitle, action, onAction }: { icon?: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 26, alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border }}><View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.accentSurface, alignItems: "center", justifyContent: "center" }}><MaterialIcons name={icon} size={26} color={colors.primary} /></View><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "900", textAlign: "center" }}>{title}</Text>{subtitle && <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 19 }}>{subtitle}</Text>}{action && onAction && <Pressable onPress={onAction} style={{ paddingTop: 4 }}><Text style={{ color: colors.primary, fontWeight: "900", fontSize: 13 }}>{action}</Text></Pressable>}</View>;
}

export function ModalShell({ visible, title, onClose, children, presentation = "center", scrollable = true }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; presentation?: "sheet" | "center"; scrollable?: boolean }) {
  const colors = useColors();
  const centered = presentation === "center";
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, visible]);
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent><View style={[styles.modalOverlay, centered ? styles.centeredOverlay : styles.sheetOverlay]}><Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} accessibilityLabel="إغلاق" /><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboard}><Animated.View style={[styles.modalCard, centered ? styles.centeredCard : styles.sheetCard, { backgroundColor: colors.background, opacity, transform: [{ scale: centered ? scale : 1 }] }]}><View style={{ width: 42, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: "center", marginBottom: 2, opacity: centered ? 0 : 1 }} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><IconButton icon="close" onPress={onClose} label="إغلاق" /><Text style={{ color: colors.foreground, fontSize: 19, fontWeight: "900", lineHeight: 26, flex: 1, textAlign: "right" }}>{title}</Text></View>{scrollable ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>{children}</ScrollView> : children}</Animated.View></KeyboardAvoidingView></View></Modal>;
}

export function ConfirmDialog({ visible, title, message, confirmLabel = "تأكيد الحذف", onClose, onConfirm }: { visible: boolean; title: string; message: string; confirmLabel?: string; onClose: () => void; onConfirm: () => void }) {
  const colors = useColors();
  return <ModalShell visible={visible} title={title} onClose={onClose}><View style={{ gap: 16 }}><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: "right" }}>{message}</Text><View style={{ flexDirection: "row", gap: 10 }}><Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>إلغاء</Text></Pressable><Pressable onPress={onConfirm} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 15, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}><Text style={{ color: colors.background, fontSize: 13, fontWeight: "900" }}>{confirmLabel}</Text></Pressable></View></View></ModalShell>;
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "error" }) {
  const colors = useColors();
  const background = tone === "success" ? colors.successSurface : tone === "warning" ? colors.warningSurface : tone === "error" ? colors.errorSurface : colors.surface;
  const foreground = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.muted;
  return <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: background }}><Text style={{ color: foreground, fontSize: 11, fontWeight: "800" }}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.38)" },
  centeredOverlay: { justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  sheetOverlay: { justifyContent: "flex-end" },
  modalKeyboard: { width: "100%", alignItems: "center" },
  modalCard: { width: "100%", maxHeight: "88%", padding: 20, gap: 16, overflow: "hidden" },
  modalContent: { width: "100%", gap: 14, paddingBottom: 2 },
  centeredCard: { width: "92%", maxWidth: 420, borderRadius: 24, borderWidth: 1 },
  sheetCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
