import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { AppLogo } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { useSecurity } from "@/lib/security";

export function SecurityGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const security = useSecurity();
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const canSubmitPin = security.setupRequired
    ? pin.length === 6
    : security.pinNeedsUpgrade
      ? pin.length >= 4 && pin.length <= 6
      : pin.length === 6;

  const handlePin = async () => {
    if (!canSubmitPin || unlocking || security.lockoutSeconds > 0) return;
    setUnlocking(true);
    try {
      const result = security.setupRequired
        ? await security.setPin(pin)
        : await security.verifyPin(pin);
      if (!result.ok) { setMessage(result.message ?? "رمز PIN غير صحيح."); setPin(""); return; }
      setMessage(""); setPin("");
    } catch {
      setMessage("تعذر فتح التطبيق الآن. حاول مرة أخرى أو استخدم البصمة.");
      setPin("");
    } finally {
      setUnlocking(false);
    }
  };
  const addDigit = (digit: string) => { if (pin.length < 6) { setPin((value) => `${value}${digit}`); setMessage(""); } };
  const removeDigit = () => { setPin((value) => value.slice(0, -1)); setMessage(""); };
  const unlockWithBiometric = security.unlockWithBiometric;
  const handleBiometric = useCallback(async () => { setUnlocking(true); const result = await unlockWithBiometric(); setUnlocking(false); if (!result.ok && result.message) setMessage(result.message); }, [unlockWithBiometric]);
  useEffect(() => { if (!security.locked || !security.biometricEnabled || !security.hasBiometric) return; const timer = setTimeout(() => { void handleBiometric(); }, 250); return () => clearTimeout(timer); }, [handleBiometric, security.biometricEnabled, security.hasBiometric, security.locked]);
  useEffect(() => {
    if (!security.locked) return;
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, security.locked]);

  if (!security.hydrated) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}><ActivityIndicator size="small" color={colors.primary} /><Text style={{ color: colors.muted, fontSize: 12 }}>جارٍ تأمين بياناتك…</Text></View></ScreenContainer>;
  if (!security.locked) return <>{children}</>;
  const isLockedOut = security.lockoutSeconds > 0;
  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return <><Modal transparent visible animationType="fade" onRequestClose={() => undefined} statusBarTranslucent><KeyboardAvoidingView style={{ flex: 1, width: "100%" }} behavior={Platform.OS === "ios" ? "padding" : "height"}><View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "rgba(0, 0, 0, 0.42)" }}><Animated.View style={{ width: "92%", maxWidth: 420, maxHeight: "84%", borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 24, elevation: 12, opacity, transform: [{ scale }] }}><ScrollView contentContainerStyle={{ padding: 22, alignItems: "center", gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><AppLogo /><View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="lock" size={28} color={colors.background} /></View><View style={{ gap: 5, alignItems: "center" }}><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "900" }}>{security.setupRequired ? "أنشئ رمز الحماية" : "التطبيق مقفل"}</Text><Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 19 }}>{security.setupRequired ? (Platform.OS === "web" ? "اختر رمز PIN من 6 أرقام لقفل المعاينة؛ تُشفّر البيانات في تخزين المتصفح." : "اختر رمز PIN من 6 أرقام لقفل التطبيق؛ تُشفّر البيانات بمفتاح يحميه التخزين الآمن في الجهاز.") : security.pinNeedsUpgrade ? "رمزك القديم مقبول مؤقتًا. غيّره من الإعدادات إلى 6 أرقام." : "بيانات التلاميذ والمالية محمية. استخدم البصمة أو أدخل رمز PIN من 6 أرقام."}</Text></View><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" }}>رمز PIN قفل محلي وليس تسجيل دخول بحساب. لا توجد استعادة عبر SMS أو البريد؛ احتفظ بالرمز وبنسخة مشفّرة.</Text><View style={{ flexDirection: "row", gap: 11, height: 24, alignItems: "center" }}>{Array.from({ length: 6 }).map((_, index) => <View key={index} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: index < pin.length ? colors.primary : colors.border, borderWidth: index === pin.length ? 1 : 0, borderColor: colors.primary }} />)}</View>{message ? <Text style={{ color: colors.error, fontSize: 12, textAlign: "center" }}>{message}</Text> : isLockedOut ? <Text style={{ color: colors.warning, fontSize: 12, textAlign: "center" }}>حاول بعد {security.lockoutSeconds} ثانية</Text> : null}<View style={{ width: "100%", maxWidth: 270, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 9 }}>{keypad.map((digit) => <Pressable key={digit} disabled={isLockedOut || unlocking} onPress={() => addDigit(digit)} style={({ pressed }) => ({ width: 78, height: 48, borderRadius: 15, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed || unlocking ? 0.65 : 1 })}><Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>{digit}</Text></Pressable>)}<Pressable disabled={isLockedOut || unlocking} onPress={removeDigit} style={({ pressed }) => ({ width: 78, height: 48, borderRadius: 15, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed || unlocking ? 0.65 : 1 })}><MaterialIcons name="backspace" size={21} color={colors.foreground} /></Pressable><Pressable disabled={isLockedOut || unlocking} onPress={() => addDigit("0")} style={({ pressed }) => ({ width: 78, height: 48, borderRadius: 15, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed || unlocking ? 0.65 : 1 })}><Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>0</Text></Pressable><Pressable disabled={isLockedOut || unlocking} onPress={handlePin} style={({ pressed }) => ({ width: 78, height: 48, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pressed || unlocking || !canSubmitPin ? 0.5 : 1 })}><MaterialIcons name={security.setupRequired ? "lock" : "lock-open"} size={21} color={colors.background} /></Pressable></View>{!security.setupRequired && security.biometricEnabled && security.hasBiometric ? <Pressable onPress={handleBiometric} disabled={unlocking} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, padding: 8, opacity: pressed || unlocking ? 0.6 : 1 })}><MaterialIcons name="fingerprint" size={25} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }}>فتح باستخدام {security.biometricLabel}</Text></Pressable> : null}<Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>لا تشارك رمز PIN مع أي شخص.</Text></ScrollView></Animated.View></View></KeyboardAvoidingView></Modal></>;
}
