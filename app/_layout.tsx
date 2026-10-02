import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Alert, I18nManager, Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { LessonNotificationSync } from "@/components/lesson-notification-sync";
import { ScreenContainer } from "@/components/screen-container";
import { SecurityGate } from "@/components/security-gate";
import { useColors } from "@/hooks/use-colors";
import {
  DaftarProvider,
  setPersistenceFailureHandler,
  useDaftar,
} from "@/lib/daftar-store";
import { SecurityProvider } from "@/lib/security";
import { ThemeProvider } from "@/lib/theme-provider";

export const unstable_settings = { anchor: "(tabs)" };

if (Platform.OS !== "web") {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function PersistenceAlertBridge() {
  useEffect(() => {
    setPersistenceFailureHandler(({ title, message, retry, dismiss }) => {
      Alert.alert(title, message, [
        ...(dismiss ? [{ text: "لاحقًا", style: "cancel" as const, onPress: dismiss }] : []),
        ...(retry ? [{ text: "إعادة المحاولة", onPress: retry }] : []),
        ...(!retry && !dismiss ? [{ text: "حسنًا" }] : []),
      ]);
    });
    return () => setPersistenceFailureHandler(null);
  }, []);
  return null;
}

function DataHydrationGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { hydrated } = useDaftar();
  if (hydrated) return <>{children}</>;
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: colors.border, borderTopColor: colors.primary }} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>جارٍ فك تشفير بياناتك…</Text>
      </View>
    </ScreenContainer>
  );
}

export default function RootLayout() {
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SecurityProvider>
        <SecurityGate>
          <DaftarProvider>
            <PersistenceAlertBridge />
            <LessonNotificationSync />
            <DataHydrationGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="group/[id]" options={{ presentation: "card" }} />
                <Stack.Screen name="group/new" options={{ presentation: "card" }} />
                <Stack.Screen name="group/[id]/attendance" options={{ presentation: "card" }} />
                <Stack.Screen name="student/[id]" options={{ presentation: "modal" }} />
                <Stack.Screen name="student/new" options={{ presentation: "card" }} />
                <Stack.Screen name="payment/new" options={{ presentation: "card" }} />
                <Stack.Screen name="expense/new" options={{ presentation: "card" }} />
                <Stack.Screen name="archive" options={{ presentation: "card" }} />
                <Stack.Screen name="today" options={{ presentation: "card" }} />
              </Stack>
              <StatusBar style="auto" />
            </DataHydrationGate>
          </DaftarProvider>
        </SecurityGate>
      </SecurityProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>{content}</SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {content}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
