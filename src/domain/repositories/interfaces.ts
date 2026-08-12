import {
  Student,
  Group,
  Attendance,
  Payment,
  Expense,
  Settings,
  Teacher,
  Notification,
  Classroom
} from '../models';

export interface IStudentRepository {
  subscribeAll(userId: string, onData: (students: Student[]) => void, onError: (err: Error) => void): () => void;
  subscribeByGroup(userId: string, groupId: string, onData: (students: Student[]) => void, onError: (err: Error) => void): () => void;
  add(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  edit(userId: string, id: string, student: Partial<Student>): Promise<void>;
  update(userId: string, id: string, updates: Partial<Student>): Promise<void>;
}

export interface IGroupRepository {
  get(id: string): Promise<Group | null>;
  subscribe(userId: string, onData: (groups: Group[]) => void, onError: (err: Error) => void): () => void;
  add(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  edit(userId: string, id: string, group: Partial<Group>): Promise<void>;
}

export interface IAttendanceRepository {
  getAttendanceBySession?: (sessionId: string) => Promise<Record<string, string>>;
  confirmSession(
    userId: string,
    groupId: string,
    sessionId: string,
    students: Student[],
    groupPaymentAmount: number,
    groupPaymentCycleSessions: number,
    draftAttendance: Record<string, 'present' | 'absent' | 'excused'>,
    draftPayment: Record<string, boolean>
  ): Promise<void>;
}

export interface IPaymentRepository {
  subscribeGlobalPayments(userId: string, onData: (payments: Payment[]) => void): () => void;
  subscribePayments(userId: string, groupId: string, onData: (payments: Payment[]) => void): () => void;
}

export interface IExpenseRepository {
  subscribeGlobalExpenses(userId: string, onData: (expenses: Expense[]) => void): () => void;
  subscribeExpenses(userId: string, groupId: string, onData: (expenses: Expense[]) => void): () => void;
  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<void>;
  deleteExpense(userId: string, id: string): Promise<void>;
}

export interface ISettingsRepository {
  getSettings(userId: string): Promise<Settings | null>;
  updateSettings(userId: string, settings: Partial<Settings>): Promise<void>;
}

export interface ITeacherRepository {
  getTeacher(userId: string): Promise<Teacher | null>;
  updateTeacher(userId: string, updates: Partial<Teacher>): Promise<void>;
  activateProKey(activationKey: string): Promise<{ success: boolean; message: string }>;
}

export interface INotificationRepository {
  subscribeNotifications(userId: string, onData: (notifications: Notification[]) => void): () => void;
  markAsRead(id: string): Promise<void>;
}

export interface IClassroomRepository {
  subscribe(userId: string, onData: (classrooms: Classroom[]) => void, onError: (err: Error) => void): () => void;
  add(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  edit(userId: string, id: string, classroom: Partial<Classroom>): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
}
