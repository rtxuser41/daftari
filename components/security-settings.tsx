import { useState } from "react";
import { Alert, Platform, Pressable, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  Field,
  ModalShell,
  PrimaryButton,
  SectionTitle,
} from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";
import { useSecurity } from "@/lib/security";

type SecurityModalMode = "set" | "change";

export function SecuritySettings() {
  const colors = useColors();
  const security = useSecurity();
  const [modalMode, setModalMode] = useState<SecurityModalMode | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const openModal = (mode: SecurityModalMode) => {
    setModalMode(mode);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setError("");
  };

  const saveSecurityChange = async () => {
    if (modalMode === "change") {
      const verified = await security.verifyPin(currentPin);
      if (!verified.ok) {
        setError(verified.message ?? "رمز PIN الحالي غير صحيح.");
        return;
      }
    }
    if (newPin !== confirmPin) {
      setError("رمزا PIN غير متطابقين.");
      return;
    }
    const result = await security.setPin(newPin);
    if (!result.ok) {
      setError(result.message ?? "تعذر حفظ رمز PIN.");
      return;
    }
    closeModal();
    Alert.alert(
      modalMode === "change" ? "تم تغيير رمز PIN" : "تم تفعيل القفل",
      modalMode === "change"
        ? "تم تحديث قفل التطبيق. بقيت البيانات مشفّرة بمفتاحها المحلي."
        : Platform.OS === "web"
          ? "شُفّرت البيانات في تخزين المتصفح، لكن حماية المعاينة أضعف من نسخة الهاتف."
          : "شُفّرت البيانات بمفتاح عشوائي يحميه التخزين الآمن في الجهاز، ويقفل التطبيق رمز PIN.",
    );
  };

  const handleBiometric = async (enabled: boolean) => {
    const result = await security.setBiometricEnabled(enabled);
    if (!result.ok) {
      Alert.alert("البصمة غير متاحة", result.message ?? "تحقق من إعدادات جهازك.");
    }
  };

  const securityRow = (
    icon: React.ComponentProps<typeof MaterialIcons>["name"],
    title: string,
    subtitle: string,
    right: React.ReactNode,
    onPress?: () => void,
  ) => (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          backgroundColor: colors.accentSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 13,
            fontWeight: "800",
            textAlign: "right",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 10,
            lineHeight: 15,
            textAlign: "right",
          }}
        >
          {subtitle}
        </Text>
      </View>
      {right}
    </Pressable>
  );

  return (
    <View>
      <SectionTitle title="الأمان والخصوصية" />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          marginBottom: 25,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 13,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <MaterialIcons name="verified-user" size={18} color={colors.success} />
          <Text
            style={{
              color: colors.success,
              fontSize: 11,
              fontWeight: "800",
              flex: 1,
              textAlign: "right",
            }}
          >
            {Platform.OS === "web"
              ? "وضع معاينة — الحماية الكاملة متاحة في نسخة الهاتف"
              : "بياناتك مشفّرة بمفتاح محمي في التخزين الآمن لهذا الجهاز"}
          </Text>
        </View>
        {security.pinNeedsUpgrade ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              backgroundColor: colors.warningSurface,
              paddingHorizontal: 8,
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <MaterialIcons name="info-outline" size={17} color={colors.warning} />
            <Text
              style={{
                color: colors.warning,
                fontSize: 11,
                lineHeight: 17,
                flex: 1,
                textAlign: "right",
              }}
            >
              لديك رمز قديم. غيّره إلى رمز جديد من 6 أرقام لتطبيق القاعدة الجديدة.
            </Text>
          </View>
        ) : null}
        {securityRow(
          "pin",
          security.pinEnabled ? "تغيير رمز PIN" : "تفعيل رمز PIN",
          security.pinEnabled
            ? "تغيير قفل التطبيق؛ يبقى مفتاح البيانات محميًا على الجهاز"
            : "فعّل قفلًا محليًا من 6 أرقام بالضبط",
          <MaterialIcons name="chevron-left" size={20} color={colors.muted} />,
          () => openModal(security.pinEnabled ? "change" : "set"),
        )}
        {security.pinEnabled
          ? securityRow(
              "lock",
              "قفل التطبيق الآن",
              "اختبر شاشة الحماية قبل مشاركة هاتفك",
              <MaterialIcons name="lock-outline" size={20} color={colors.primary} />,
              security.lock,
            )
          : null}
        {security.pinEnabled
          ? securityRow(
              "fingerprint",
              security.biometricEnabled
                ? `فتح باستخدام ${security.biometricLabel}`
                : "تفعيل البصمة أو Face ID",
              security.hasBiometric
                ? "تفتح بسرعة أثناء الجلسة مع بقاء PIN كخيار احتياطي"
                : "يتوفر هذا الخيار على أجهزة Android/iOS المدعومة",
              <Switch
                value={security.biometricEnabled}
                onValueChange={handleBiometric}
                disabled={!security.hasBiometric}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.background}
              />,
            )
          : null}
        {security.pinEnabled
          ? securityRow(
              "pause-circle-outline",
              "القفل عند مغادرة التطبيق",
              "يقفل التطبيق تلقائيًا عند العودة من الخلفية",
              <Switch
                value={security.lockOnBackground}
                onValueChange={security.setLockOnBackground}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />,
            )
          : null}
      </View>

      <ModalShell
        presentation="center"
        visible={Boolean(modalMode)}
        title={modalMode === "change" ? "تغيير رمز PIN" : "تفعيل رمز PIN"}
        onClose={closeModal}
      >
        <View style={{ gap: 14 }}>
          {modalMode === "change" ? (
            <Field
              label="رمز PIN الحالي"
              value={currentPin}
              onChangeText={(value) =>
                setCurrentPin(value.replace(/\D/g, "").slice(0, 6))
              }
              secureTextEntry
              keyboardType="number-pad"
              placeholder="••••••"
              maxLength={6}
            />
          ) : null}
          <Field
            label={modalMode === "change" ? "رمز PIN الجديد" : "رمز PIN"}
            value={newPin}
            onChangeText={(value) =>
              setNewPin(value.replace(/\D/g, "").slice(0, 6))
            }
            secureTextEntry
            keyboardType="number-pad"
            placeholder="6 أرقام بالضبط"
            maxLength={6}
          />
          <Field
            label="تأكيد رمز PIN"
            value={confirmPin}
            onChangeText={(value) =>
              setConfirmPin(value.replace(/\D/g, "").slice(0, 6))
            }
            secureTextEntry
            keyboardType="number-pad"
            placeholder="أعد كتابة 6 أرقام"
            maxLength={6}
          />
          {error ? (
            <Text style={{ color: colors.error, fontSize: 12, textAlign: "right" }}>
              {error}
            </Text>
          ) : null}
          <PrimaryButton title="حفظ رمز PIN" icon="lock" onPress={saveSecurityChange} />
        </View>
      </ModalShell>
    </View>
  );
}
