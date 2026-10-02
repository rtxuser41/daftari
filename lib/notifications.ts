import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import type { SchedulableNotificationTriggerInput } from "expo-notifications";
import type { Group } from "./daftar-store";

export const NOTIFICATIONS_ENABLED_KEY = "daftar-lesson-notifications-enabled";
const LESSON_NOTIFICATION_KIND = "daftar-daily-lessons";
const LESSON_CHANNEL_ID = "lessons";
const REMINDER_HOUR = 7;
const REMINDER_MINUTE = 0;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type LessonNotificationPermission = {
  granted: boolean;
  status: string;
};

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(LESSON_CHANNEL_ID, {
    name: "تذكيرات الحصص",
    description: "تنبيهات حصص الأستاذ لهذا اليوم",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: "#C5A059",
  });
}

export async function getLessonNotificationPermission(): Promise<LessonNotificationPermission> {
  if (Platform.OS === "web") return { granted: false, status: "web" };
  await configureAndroidChannel();
  const result = await Notifications.getPermissionsAsync();
  return { granted: result.granted || result.status === "granted", status: result.status };
}

export async function requestLessonNotificationPermission(): Promise<LessonNotificationPermission> {
  if (Platform.OS === "web") return { granted: false, status: "web" };
  await configureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  const result = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
  return { granted: result.granted || result.status === "granted", status: result.status };
}

function getGroupsByDay(groups: Group[]) {
  const groupsByDay = new Map<number, Group[]>();
  groups.filter((group) => group.active && group.days.length > 0).forEach((group) => {
    group.days.forEach((day) => {
      const current = groupsByDay.get(day) ?? [];
      groupsByDay.set(day, [...current, group]);
    });
  });
  return groupsByDay;
}

async function clearLessonReminderSchedules() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === LESSON_NOTIFICATION_KIND)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function cancelLessonReminders() {
  if (Platform.OS === "web") return;
  await clearLessonReminderSchedules();
}

export async function scheduleLessonReminders(groups: Group[]) {
  if (Platform.OS === "web") return;
  await configureAndroidChannel();
  await clearLessonReminderSchedules();

  for (const [day, dayGroups] of getGroupsByDay(groups)) {
    const names = dayGroups.map((group) => group.name).slice(0, 3).join("، ");
    const extraCount = dayGroups.length - Math.min(dayGroups.length, 3);
    const body = `لديك حصص اليوم: ${names}${extraCount > 0 ? ` و${extraCount} أخرى` : ""}`;
    const trigger: SchedulableNotificationTriggerInput = Platform.OS === "android"
      ? { type: SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour: REMINDER_HOUR, minute: REMINDER_MINUTE, channelId: LESSON_CHANNEL_ID }
      : { type: SchedulableTriggerInputTypes.CALENDAR, weekday: day + 1, hour: REMINDER_HOUR, minute: REMINDER_MINUTE, repeats: true };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "أستاذ، لديك حصص هذا اليوم",
        body,
        sound: "default",
        data: { kind: LESSON_NOTIFICATION_KIND, weekday: day + 1 },
      },
      trigger,
    });
  }
}

export const lessonReminderTimeLabel = "07:00";
