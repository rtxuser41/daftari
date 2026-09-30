import AsyncStorage from "@react-native-async-storage/async-storage";

export const LAST_BACKUP_KEY = "daftar-last-successful-backup-v1";
export const BACKUP_REMINDER_DELAY_MS = 14 * 24 * 60 * 60 * 1000;

export async function recordSuccessfulBackup(now = new Date()) {
  await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
}

export async function getLastSuccessfulBackup() {
  const raw = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) return null;
  const timestamp = new Date(raw).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function isBackupReminderDue(
  lastBackup: Date | null,
  hasUserData: boolean,
  now = new Date(),
) {
  if (!hasUserData) return false;
  if (!lastBackup) return true;
  return now.getTime() - lastBackup.getTime() >= BACKUP_REMINDER_DELAY_MS;
}
