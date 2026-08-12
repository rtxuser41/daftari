

export interface Teacher {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  isPro: boolean;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface Student {
  id?: string;
  userId: string;
  groupId: string;
  fullName: string;
  phoneNumber?: string;
  parentPhone?: string;
  notes?: string;
  customPrice?: number;
  joiningDate?: any;
  isPresent?: boolean; // Legacy
  hasPaid?: boolean; // Legacy
  isDeleted: boolean;
  sessionBalance?: number;
  lastPaymentAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export interface Timing {
  day: string;
  startTime: string;
  endTime: string;
}

export interface Group {
  id?: string;
  userId: string;
  name: string;
  subject?: string;
  level?: string;
  educationalLevel?: string;
  studyStream?: string;
  color?: string;
  sessionsPerMonth: number;
  price: number;
  timings: Timing[];
  studentCount: number;
  capacity?: number;
  classroomId?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface Classroom {
  id: string;
  userId: string;
  name: string;
  capacity: number;
  monthlyRent: number;
  address?: string;
  notes?: string;
  color?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
}

export interface Session {
  id?: string;
  userId: string;
  groupId: string;
  date: any;
  notes?: string;
  confirmedAt: any;
  createdAt: any;
}

export interface Attendance {
  id?: string;
  userId: string;
  groupId: string;
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'excused';
  createdAt: any;
}

export interface Payment {
  id?: string;
  userId: string;
  groupId: string;
  studentId: string;
  amount: number;
  paymentCycleSessions: number;
  paidAt: any;
  createdAt: any;
}

export interface Debt {
  id: string;
  studentId: string;
  groupId: string;
  amount: number;
  dueDate: Date | any;
  isResolved: boolean;
  resolvedAt?: Date | any;
  createdAt: Date | any;
}

export interface Expense {
  id?: string;
  userId: string;
  groupId: string;
  description: string;
  amount: number;
  date: any;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | any;
}

export interface Settings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en' | 'fr';
  currency: string;
  defaultPaymentCycle: number;
  createdAt: Date | any;
  updatedAt: Date | any;
}
