import { describe, expect, it, vi } from "vitest";
import { decryptBackup, encryptBackup } from "../lib/backup";
import { isBackupReminderDue } from "../lib/backup-reminder";
import { getMonthlyFinanceStats, isValidBackup, type AppState } from "../lib/daftar-store";

vi.mock("../lib/secure-storage", () => ({
  readEncryptedLocalStorage: vi.fn(),
  writeEncryptedLocalStorage: vi.fn(),
}));

const validBackup: AppState = {
  profile: { name: "أستاذ", gender: "male", subject: "رياضيات", phone: "" },
  groups: [{ id: "g1", name: "فوج", price: 2000, referenceLessons: 4, schedule: "الجمعة", days: [5], accent: "#C5A059", active: true }],
  students: [{ id: "s1", groupId: "g1", name: "تلميذ", phone: "", customPrice: null, active: true }],
  sessions: [{ id: "session1", groupId: "g1", date: "2026-09-24", attendance: { s1: "present" } }],
  payments: [{ id: "payment1", groupId: "g1", studentId: "s1", lessons: 4, amount: 2000, pricePerLesson: 500, date: "2026-09-24", note: "" }],
  expenses: [{ id: "expense1", amount: 200, description: "طباعة", category: "مستلزمات", date: "2026-09-24", active: true }],
  onboardingComplete: true,
};

describe("DAFTAR backup validation", () => {
  it("accepts a structurally valid backup", () => expect(isValidBackup(validBackup)).toBe(true));
  it("rejects malformed records, oversized collections, and orphan relationships", () => {
    expect(isValidBackup({ ...validBackup, profile: { name: "", subject: 4 } })).toBe(false);
    expect(isValidBackup({ ...validBackup, students: [{ ...validBackup.students[0], active: "yes" }] })).toBe(false);
    expect(isValidBackup({ ...validBackup, students: [{ ...validBackup.students[0], groupId: "missing" }] })).toBe(false);
    expect(isValidBackup({ ...validBackup, groups: Array.from({ length: 501 }, (_, index) => ({ ...validBackup.groups[0], id: `g${index}` })) })).toBe(false);
  });
  it("encrypts and decrypts only with the correct PIN", () => {
    const encrypted = encryptBackup(validBackup, "2580");
    expect(encrypted).not.toContain("أستاذ");
    expect(decryptBackup(encrypted, "2580")).toEqual(validBackup);
    expect(() => decryptBackup(encrypted, "1111")).toThrow();
  });
  it("rejects tampered encrypted payloads", () => {
    const encrypted = JSON.parse(encryptBackup(validBackup, "2580")) as { ciphertext: string };
    encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -2)}00`;
    expect(() => decryptBackup(JSON.stringify(encrypted), "2580")).toThrow();
  });
});

describe("DAFTAR monthly finance statistics", () => {
  it("aggregates only the selected month and excludes archived expenses", () => {
    const state: AppState = {
      ...validBackup,
      sessions: [
        { id: "session-september", groupId: "g1", date: "2026-09-10", attendance: { s1: "present" } },
        { id: "session-august", groupId: "g1", date: "2026-08-10", attendance: { s1: "present" } },
      ],
      payments: [
        { ...validBackup.payments[0], id: "payment-september", date: "2026-09-10", lessons: 2, amount: 1000 },
        { ...validBackup.payments[0], id: "payment-august", date: "2026-08-10", lessons: 4, amount: 2000 },
      ],
      expenses: [
        { ...validBackup.expenses[0], id: "expense-september", date: "2026-09-12", amount: 300, active: true },
        { ...validBackup.expenses[0], id: "expense-archived", date: "2026-09-13", amount: 500, active: false },
      ],
    };
    expect(getMonthlyFinanceStats(state, "2026-09")).toEqual({ income: 1000, expenses: 300, net: 700, sessions: 1, lessonsPaid: 2, payments: 1, expenseCount: 1 });
  });
});

describe("DAFTAR backup reminder", () => {
  const now = new Date("2026-09-27T12:00:00.000Z");

  it("is due for real data without a successful backup", () => {
    expect(isBackupReminderDue(null, true, now)).toBe(true);
  });

  it("stays quiet for empty data and recent backups", () => {
    expect(isBackupReminderDue(null, false, now)).toBe(false);
    expect(
      isBackupReminderDue(new Date("2026-09-20T12:00:00.000Z"), true, now),
    ).toBe(false);
  });

  it("returns after fourteen days", () => {
    expect(
      isBackupReminderDue(new Date("2026-09-13T12:00:00.000Z"), true, now),
    ).toBe(true);
  });
});
