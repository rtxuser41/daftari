import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  readEncryptedLocalStorage,
  writeEncryptedLocalStorage,
} from "./secure-storage";

export type AttendanceStatus = "present" | "absent";

export type Profile = {
  name: string;
  gender: "male" | "female";
  subject: string;
  phone: string;
};

export type Group = {
  id: string;
  name: string;
  price: number;
  referenceLessons: number;
  schedule: string;
  days: number[];
  accent: string;
  active: boolean;
};

export type Student = {
  id: string;
  groupId: string;
  name: string;
  phone: string;
  customPrice: number | null;
  active: boolean;
};

export type SessionRecord = {
  id: string;
  groupId: string;
  date: string;
  attendance: Record<string, AttendanceStatus>;
};

export type Payment = {
  id: string;
  groupId: string;
  studentId: string;
  lessons: number;
  amount: number;
  pricePerLesson: number;
  date: string;
  note: string;
};

export type Expense = {
  id: string;
  groupId?: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  active: boolean;
};

export type AppState = {
  profile: Profile;
  groups: Group[];
  students: Student[];
  sessions: SessionRecord[];
  payments: Payment[];
  expenses: Expense[];
  onboardingComplete: boolean;
};

export type MonthlyFinanceStats = {
  income: number;
  expenses: number;
  net: number;
  sessions: number;
  lessonsPaid: number;
  payments: number;
  expenseCount: number;
};

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthlyFinanceStats(state: AppState, monthKey: string): MonthlyFinanceStats {
  const payments = state.payments.filter((payment) => payment.date.startsWith(monthKey));
  const expenses = state.expenses.filter((expense) => expense.active && expense.date.startsWith(monthKey));
  const income = payments.reduce((total, payment) => total + payment.amount, 0);
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  return {
    income,
    expenses: expenseTotal,
    net: income - expenseTotal,
    sessions: state.sessions.filter((session) => session.date.startsWith(monthKey)).length,
    lessonsPaid: payments.reduce((total, payment) => total + payment.lessons, 0),
    payments: payments.length,
    expenseCount: expenses.length,
  };
}

export const BACKUP_SCHEMA_VERSION = 2;
const EMPTY_STATE: AppState = {
  profile: { name: "", gender: "male", subject: "", phone: "" },
  groups: [],
  students: [],
  sessions: [],
  payments: [],
  expenses: [],
  onboardingComplete: false,
};

type PersistenceFailureHandler = (options: {
  title: string;
  message: string;
  retry?: () => void;
  dismiss?: () => void;
}) => void;

let persistenceFailureHandler: PersistenceFailureHandler | null = null;

export function setPersistenceFailureHandler(handler: PersistenceFailureHandler | null) {
  persistenceFailureHandler = handler;
}

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const currentDate = () => new Date().toISOString().slice(0, 10);

const dayMap: Record<string, number> = {
  الأحد: 0,
  الاحد: 0,
  الإثنين: 1,
  الاثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
};

export function scheduleDays(schedule: string, fallback?: number[]) {
  if (fallback?.length) return [...new Set(fallback)].filter((day) => day >= 0 && day <= 6);
  const found = Object.entries(dayMap).find(([label]) => schedule.includes(label));
  return found ? [found[1]] : [];
}

export function formatDzd(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} دج`;
}

export function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString("ar-DZ", { day: "numeric", month: "short" });
}

export function getAcademicYear(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 9 ? `${year}–${year + 1}` : `${year - 1}–${year}`;
}

export function effectiveStudentPrice(student: Student, group?: Group) {
  return student.customPrice ?? group?.price ?? 0;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

export function isValidBackup(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppState>;
  const profile = candidate.profile;
  if (!profile || typeof profile.name !== "string" || typeof profile.subject !== "string" || typeof profile.phone !== "string") return false;
  if (!Array.isArray(candidate.groups) || candidate.groups.length > 500) return false;
  if (!Array.isArray(candidate.students) || candidate.students.length > 50000) return false;
  if (!Array.isArray(candidate.sessions) || candidate.sessions.length > 100000) return false;
  if (!Array.isArray(candidate.payments) || candidate.payments.length > 100000) return false;
  if (!Array.isArray(candidate.expenses) || candidate.expenses.length > 100000) return false;
  const groups = candidate.groups;
  const students = candidate.students;
  const groupIds = new Set(groups.map((group) => group?.id));
  const studentIds = new Set(students.map((student) => student?.id));
  const validGroups = groups.every((group) => group && typeof group.id === "string" && group.id.length > 0 && typeof group.name === "string" && group.name.trim().length > 0 && Number.isFinite(group.price) && group.price > 0 && Number.isInteger(group.referenceLessons) && group.referenceLessons > 0 && typeof group.schedule === "string" && Array.isArray(group.days) && group.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) && typeof group.active === "boolean");
  const validStudents = students.every((student) => student && typeof student.id === "string" && typeof student.groupId === "string" && groupIds.has(student.groupId) && typeof student.name === "string" && student.name.trim().length > 0 && typeof student.phone === "string" && (student.customPrice === null || (Number.isFinite(student.customPrice) && student.customPrice > 0)) && typeof student.active === "boolean");
  const validSessions = candidate.sessions.every((session) => session && typeof session.id === "string" && typeof session.groupId === "string" && groupIds.has(session.groupId) && validDate(session.date) && session.attendance && typeof session.attendance === "object" && Object.entries(session.attendance).every(([studentId, status]) => studentIds.has(studentId) && (status === "present" || status === "absent")));
  const validPayments = candidate.payments.every((payment) => payment && typeof payment.id === "string" && typeof payment.groupId === "string" && groupIds.has(payment.groupId) && typeof payment.studentId === "string" && studentIds.has(payment.studentId) && students.find((student) => student.id === payment.studentId)?.groupId === payment.groupId && Number.isInteger(payment.lessons) && payment.lessons > 0 && Number.isFinite(payment.amount) && payment.amount > 0 && Number.isFinite(payment.pricePerLesson) && payment.pricePerLesson > 0 && validDate(payment.date) && typeof payment.note === "string");
  const validExpenses = candidate.expenses.every((expense) => expense && typeof expense.id === "string" && (!expense.groupId || groupIds.has(expense.groupId)) && Number.isFinite(expense.amount) && expense.amount > 0 && typeof expense.description === "string" && expense.description.trim().length > 0 && typeof expense.category === "string" && expense.category.trim().length > 0 && validDate(expense.date) && typeof expense.active === "boolean");
  return validGroups && validStudents && validSessions && validPayments && validExpenses;
}

function migrateState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") throw new Error("invalid_local_state");
  const source = raw as Partial<AppState>;
  const groups = Array.isArray(source.groups) ? source.groups.map((group) => ({ ...group, days: scheduleDays(group.schedule ?? "", (group as Group).days), active: (group as Group).active ?? true })) : [];
  const students = Array.isArray(source.students) ? source.students.map((student) => ({ ...student, customPrice: (student as Student).customPrice ?? null, active: (student as Student).active ?? true })) : [];
  const payments = Array.isArray(source.payments) ? source.payments.map((payment) => ({ ...payment, pricePerLesson: (payment as Payment).pricePerLesson ?? (payment.lessons > 0 ? payment.amount / payment.lessons : 0) })) : [];
  const expenses = Array.isArray(source.expenses) ? source.expenses.map((expense) => ({ ...expense, active: (expense as Expense).active ?? true })) : [];
  const migrated = { ...clone(EMPTY_STATE), ...source, groups, students, payments, expenses } as AppState;
  if (!isValidBackup(migrated)) throw new Error("invalid_local_state");
  return migrated;
}

type StoreValue = {
  state: AppState;
  hydrated: boolean;
  getGroup: (id: string) => Group | undefined;
  getStudent: (id: string) => Student | undefined;
  getStudentStats: (studentId: string) => { attended: number; paidLessons: number; balance: number; debtAmount: number; prepaidAmount: number; effectivePrice: number };
  getGroupStats: (groupId: string) => { collected: number; expected: number; debt: number; expenses: number; net: number };
  addGroup: (input: Omit<Group, "id" | "accent" | "active">) => void;
  updateGroup: (groupId: string, input: Omit<Group, "id" | "accent" | "active">) => void;
  deleteGroup: (groupId: string) => void;
  archiveGroup: (groupId: string) => void;
  restoreGroup: (groupId: string) => void;
  addStudent: (input: Omit<Student, "id" | "active">) => void;
  updateStudent: (studentId: string, input: Omit<Student, "id" | "active">) => void;
  deleteStudent: (studentId: string) => void;
  archiveStudent: (studentId: string) => void;
  restoreStudent: (studentId: string) => void;
  addSession: (groupId: string, attendance: Record<string, AttendanceStatus>) => void;
  addPayment: (input: Omit<Payment, "id" | "date" | "pricePerLesson"> & { date?: string; pricePerLesson?: number }) => void;
  addExpense: (input: Omit<Expense, "id" | "date" | "active"> & { date?: string }) => void;
  updateExpense: (expenseId: string, input: Omit<Expense, "id" | "date" | "active">) => void;
  deleteExpense: (expenseId: string) => void;
  archiveExpense: (expenseId: string) => void;
  restoreExpense: (expenseId: string) => void;
  updateProfile: (profile: Profile) => void;
  resetData: () => void;
  exportData: () => AppState;
  restoreData: (data: AppState) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function DaftarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(clone(EMPTY_STATE));
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  const saveRequestedRef = useRef(false);
  const saveRunningRef = useRef(false);
  const saveAlertVisibleRef = useRef(false);
  const loadFailedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let mounted = true;
    void readEncryptedLocalStorage()
      .then((stored) => {
        if (mounted && stored) setState(migrateState(JSON.parse(stored)));
      })
      .catch(() => {
        if (!mounted) return;
        loadFailedRef.current = true;
        persistenceFailureHandler?.({
          title: "تعذر فتح البيانات",
          message:
            "لم يتمكن التطبيق من فك تشفير البيانات المحلية. أغلق التطبيق وحاول إدخال رمز PIN مجددًا، ولا تحذف بيانات التطبيق قبل الاحتفاظ بنسخة احتياطية.",
        });
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistLatestState = useCallback(async () => {
    if (saveRunningRef.current) return;
    saveRunningRef.current = true;
    try {
      while (saveRequestedRef.current) {
        saveRequestedRef.current = false;
        const payload = JSON.stringify(stateRef.current);
        try {
          await writeEncryptedLocalStorage(payload);
        } catch {
          try {
            await new Promise((resolve) => setTimeout(resolve, 250));
            await writeEncryptedLocalStorage(payload);
          } catch {
            saveRequestedRef.current = true;
            if (!saveAlertVisibleRef.current) {
              saveAlertVisibleRef.current = true;
              persistenceFailureHandler?.({
                title: "لم تُحفظ آخر عملية",
                message:
                  "التغيير ما زال ظاهرًا داخل التطبيق، لكن تعذر حفظه على الجهاز. تحقق من مساحة التخزين ثم أعد المحاولة.",
                retry: () => {
                  saveAlertVisibleRef.current = false;
                  void persistLatestState();
                },
                dismiss: () => {
                  saveAlertVisibleRef.current = false;
                },
              });
              if (!persistenceFailureHandler) saveAlertVisibleRef.current = false;
            }
            break;
          }
        }
      }
    } finally {
      saveRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hydrated || loadFailedRef.current) return;
    saveRequestedRef.current = true;
    void persistLatestState();
  }, [hydrated, persistLatestState, state]);

  const getGroup = useCallback((id: string) => state.groups.find((group) => group.id === id), [state.groups]);
  const getStudent = useCallback((id: string) => state.students.find((student) => student.id === id), [state.students]);

  const getStudentStats = useCallback((studentId: string) => {
    const student = state.students.find((item) => item.id === studentId);
    const group = student ? state.groups.find((item) => item.id === student.groupId) : undefined;
    const attended = state.sessions.reduce((total, session) => total + (session.attendance[studentId] === "present" ? 1 : 0), 0);
    const paidLessons = state.payments.filter((payment) => payment.studentId === studentId).reduce((total, payment) => total + payment.lessons, 0);
    const balance = attended - paidLessons;
    const price = student ? effectiveStudentPrice(student, group) : 0;
    const unitPrice = group && group.referenceLessons > 0 ? price / group.referenceLessons : 0;
    return { attended, paidLessons, balance, debtAmount: Math.max(balance, 0) * unitPrice, prepaidAmount: Math.max(-balance, 0) * unitPrice, effectivePrice: price };
  }, [state.groups, state.payments, state.sessions, state.students]);

  const getGroupStats = useCallback((groupId: string) => {
    const collected = state.payments.filter((payment) => payment.groupId === groupId).reduce((total, payment) => total + payment.amount, 0);
    const groupStudents = state.students.filter((student) => student.groupId === groupId);
    const debt = groupStudents.reduce((total, student) => total + getStudentStats(student.id).debtAmount, 0);
    const expected = groupStudents.reduce((total, student) => total + getStudentStats(student.id).attended * (getStudentStats(student.id).effectivePrice / (state.groups.find((group) => group.id === groupId)?.referenceLessons || 1)), 0);
    const expenses = state.expenses.filter((expense) => expense.active && (!expense.groupId || expense.groupId === groupId)).reduce((total, expense) => total + expense.amount, 0);
    return { collected, expected, debt, expenses, net: collected - expenses };
  }, [getStudentStats, state.expenses, state.groups, state.students, state.payments]);

  const addGroup = useCallback((input: Omit<Group, "id" | "accent" | "active">) => {
    if (!input.name.trim() || !Number.isFinite(input.price) || input.price <= 0 || !Number.isInteger(input.referenceLessons) || input.referenceLessons <= 0) return;
    setState((current) => ({ ...current, groups: [...current.groups, { ...input, name: input.name.trim(), days: scheduleDays(input.schedule, input.days), id: createId("group"), accent: "#C5A059", active: true }] }));
  }, []);

  const updateGroup = useCallback((groupId: string, input: Omit<Group, "id" | "accent" | "active">) => {
    if (!input.name.trim() || !Number.isFinite(input.price) || input.price <= 0 || !Number.isInteger(input.referenceLessons) || input.referenceLessons <= 0 || !input.days.length) return;
    setState((current) => ({ ...current, groups: current.groups.map((group) => group.id === groupId ? { ...group, ...input, name: input.name.trim(), schedule: input.schedule.trim(), days: scheduleDays(input.schedule, input.days) } : group) }));
  }, []);

  const deleteGroup = useCallback((groupId: string) => setState((current) => ({ ...current, groups: current.groups.filter((group) => group.id !== groupId), students: current.students.filter((student) => student.groupId !== groupId), sessions: current.sessions.filter((session) => session.groupId !== groupId), payments: current.payments.filter((payment) => payment.groupId !== groupId), expenses: current.expenses.filter((expense) => expense.groupId !== groupId) })), []);

  const archiveGroup = useCallback((groupId: string) => setState((current) => ({ ...current, groups: current.groups.map((group) => group.id === groupId ? { ...group, active: false } : group) })), []);
  const restoreGroup = useCallback((groupId: string) => setState((current) => ({ ...current, groups: current.groups.map((group) => group.id === groupId ? { ...group, active: true } : group) })), []);

  const addStudent = useCallback((input: Omit<Student, "id" | "active">) => {
    setState((current) => {
      const group = current.groups.find((item) => item.id === input.groupId);
      const customPrice = input.customPrice == null ? null : Number(input.customPrice);
      if (!group || !input.name.trim() || (customPrice !== null && (!Number.isFinite(customPrice) || customPrice <= 0))) return current;
      return { ...current, students: [...current.students, { ...input, name: input.name.trim(), phone: input.phone.trim(), customPrice, id: createId("student"), active: true }] };
    });
  }, []);

  const updateStudent = useCallback((studentId: string, input: Omit<Student, "id" | "active">) => {
    setState((current) => {
      const student = current.students.find((item) => item.id === studentId);
      const group = current.groups.find((item) => item.id === input.groupId);
      const customPrice = input.customPrice == null ? null : Number(input.customPrice);
      if (!student || !group || !input.name.trim() || (customPrice !== null && (!Number.isFinite(customPrice) || customPrice <= 0))) return current;
      return { ...current, students: current.students.map((item) => item.id === studentId ? { ...item, groupId: group.id, name: input.name.trim(), phone: input.phone.trim(), customPrice } : item) };
    });
  }, []);

  const deleteStudent = useCallback((studentId: string) => setState((current) => ({ ...current, students: current.students.filter((student) => student.id !== studentId), sessions: current.sessions.map((session) => { const attendance = { ...session.attendance }; delete attendance[studentId]; return { ...session, attendance }; }).filter((session) => Object.keys(session.attendance).length > 0), payments: current.payments.filter((payment) => payment.studentId !== studentId) })), []);

  const archiveStudent = useCallback((studentId: string) => setState((current) => ({ ...current, students: current.students.map((student) => student.id === studentId ? { ...student, active: false } : student) })), []);
  const restoreStudent = useCallback((studentId: string) => setState((current) => ({ ...current, students: current.students.map((student) => student.id === studentId ? { ...student, active: true } : student) })), []);

  const addSession = useCallback((groupId: string, attendance: Record<string, AttendanceStatus>) => {
    setState((current) => {
      const groupStudentIds = new Set(current.students.filter((student) => student.groupId === groupId).map((student) => student.id));
      const cleanAttendance = Object.fromEntries(Object.entries(attendance).filter(([studentId, status]) => groupStudentIds.has(studentId) && (status === "present" || status === "absent")));
      if (!current.groups.some((group) => group.id === groupId) || !Object.keys(cleanAttendance).length) return current;
      return { ...current, sessions: [{ id: createId("session"), groupId, date: currentDate(), attendance: cleanAttendance }, ...current.sessions] };
    });
  }, []);

  const addPayment = useCallback((input: Omit<Payment, "id" | "date" | "pricePerLesson"> & { date?: string; pricePerLesson?: number }) => {
    setState((current) => {
      const student = current.students.find((item) => item.id === input.studentId);
      const group = current.groups.find((item) => item.id === input.groupId);
      const lessons = Number(input.lessons);
      const amount = Number(input.amount);
      if (!student || !group || student.groupId !== group.id || !Number.isInteger(lessons) || lessons <= 0 || !Number.isFinite(amount) || amount <= 0) return current;
      return { ...current, payments: [{ ...input, id: createId("payment"), date: input.date ?? currentDate(), pricePerLesson: input.pricePerLesson ?? amount / lessons, lessons, amount, note: input.note.trim() }, ...current.payments] };
    });
  }, []);

  const addExpense = useCallback((input: Omit<Expense, "id" | "date" | "active"> & { date?: string }) => {
    setState((current) => {
      if (!input.description.trim() || !input.category.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || (input.groupId && !current.groups.some((group) => group.id === input.groupId))) return current;
      return { ...current, expenses: [{ ...input, id: createId("expense"), date: input.date ?? currentDate(), active: true, description: input.description.trim(), category: input.category.trim() }, ...current.expenses] };
    });
  }, []);

  const updateExpense = useCallback((expenseId: string, input: Omit<Expense, "id" | "date" | "active">) => {
    setState((current) => {
      if (!input.description.trim() || !input.category.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || (input.groupId && !current.groups.some((group) => group.id === input.groupId))) return current;
      return { ...current, expenses: current.expenses.map((expense) => expense.id === expenseId ? { ...expense, groupId: input.groupId, amount: input.amount, description: input.description.trim(), category: input.category.trim() } : expense) };
    });
  }, []);

  const deleteExpense = useCallback((expenseId: string) => setState((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== expenseId) })), []);

  const archiveExpense = useCallback((expenseId: string) => setState((current) => ({ ...current, expenses: current.expenses.map((expense) => expense.id === expenseId ? { ...expense, active: false } : expense) })), []);
  const restoreExpense = useCallback((expenseId: string) => setState((current) => ({ ...current, expenses: current.expenses.map((expense) => expense.id === expenseId ? { ...expense, active: true } : expense) })), []);
  const updateProfile = useCallback((profile: Profile) => { if (profile.name.trim() && profile.subject.trim()) setState((current) => ({ ...current, profile: { ...profile, name: profile.name.trim(), subject: profile.subject.trim(), phone: profile.phone.trim() }, onboardingComplete: true })); }, []);
  const resetData = useCallback(() => setState({ ...clone(EMPTY_STATE) }), []);
  const exportData = useCallback(() => clone(state), [state]);
  const restoreData = useCallback((data: AppState) => { if (isValidBackup(data)) setState({ ...clone(data), onboardingComplete: true }); }, []);

  const value = useMemo(() => ({ state, hydrated, getGroup, getStudent, getStudentStats, getGroupStats, addGroup, updateGroup, deleteGroup, archiveGroup, restoreGroup, addStudent, updateStudent, deleteStudent, archiveStudent, restoreStudent, addSession, addPayment, addExpense, updateExpense, deleteExpense, archiveExpense, restoreExpense, updateProfile, resetData, exportData, restoreData }), [state, hydrated, getGroup, getStudent, getStudentStats, getGroupStats, addGroup, updateGroup, deleteGroup, archiveGroup, restoreGroup, addStudent, updateStudent, deleteStudent, archiveStudent, restoreStudent, addSession, addPayment, addExpense, updateExpense, deleteExpense, archiveExpense, restoreExpense, updateProfile, resetData, exportData, restoreData]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDaftar() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useDaftar must be used inside DaftarProvider");
  return value;
}
