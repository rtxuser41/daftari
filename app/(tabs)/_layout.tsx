import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";

function TabIcon({ name, color }: { name: React.ComponentProps<typeof MaterialIcons>["name"]; color: string }) {
  return <MaterialIcons name={name} color={color} size={23} />;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontFamily: "System", fontSize: 11, fontWeight: "600" },
        tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="finance" options={{ title: "المالية", tabBarIcon: ({ color }) => <TabIcon name="account-balance-wallet" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "الإعدادات", tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} /> }} />
    </Tabs>
  );
}
