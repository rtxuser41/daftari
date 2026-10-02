import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useDaftar } from "@/lib/daftar-store";
import { getLessonNotificationPermission, NOTIFICATIONS_ENABLED_KEY, scheduleLessonReminders } from "@/lib/notifications";

export function LessonNotificationSync() {
  const { state, hydrated } = useDaftar();
  const lastSignature = useRef("");
  const signature = useMemo(
    () => JSON.stringify(state.groups.filter((group) => group.active).map((group) => ({ id: group.id, name: group.name, days: group.days }))),
    [state.groups],
  );

  useEffect(() => {
    if (Platform.OS === "web" || !hydrated || signature === lastSignature.current) return;
    lastSignature.current = signature;
    let cancelled = false;
    void Promise.all([AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY), getLessonNotificationPermission()]).then(([saved, permission]) => {
      if (!cancelled && saved === "true" && permission.granted) void scheduleLessonReminders(state.groups);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [hydrated, signature, state.groups]);

  return null;
}
