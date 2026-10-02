import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, View } from "react-native";

import { SectionTitle } from "@/components/daftar-ui";
import { useColors } from "@/hooks/use-colors";

type StatusItem = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  description: string;
};

const statusItems: StatusItem[] = [
  {
    icon: "account-circle",
    title: "تسجيل الدخول",
    description:
      "لا يوجد حساب عبر الإنترنت في هذه النسخة؛ لا يعمل تسجيل الدخول برقم الهاتف وكلمة المرور.",
  },
  {
    icon: "vpn-key",
    title: "استعادة الوصول",
    description:
      "لا توجد استعادة عبر رسالة SMS أو البريد. رمز PIN يحمي بيانات هذا الهاتف؛ إذا نُسي، لا يمكن فتح البيانات إلا بملف نسخة مشفّرة ورمزها نفسه.",
  },
  {
    icon: "cloud-off",
    title: "المزامنة السحابية",
    description:
      "غير متاحة. تبقى البيانات على هذا الجهاز؛ انقلها يدويًا بملف نسخة مشفّرة واحتفظ برمزها.",
  },
  {
    icon: "translate",
    title: "لغة التطبيق",
    description: "العربية فقط حاليًا؛ لا يوجد اختيار لغة آخر في هذه النسخة.",
  },
];

export function LocalAppStatus() {
  const colors = useColors();

  return (
    <View>
      <SectionTitle title="الحساب والوصول" />
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
        {statusItems.map((item, index) => (
          <View
            key={item.title}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 11,
              paddingVertical: 13,
              borderBottomWidth: index === statusItems.length - 1 ? 0 : 1,
              borderBottomColor: colors.border,
            }}
          >
            <MaterialIcons
              name={item.icon}
              size={19}
              color={colors.muted}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 13,
                  fontWeight: "800",
                  textAlign: "right",
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  lineHeight: 18,
                  textAlign: "right",
                }}
              >
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
