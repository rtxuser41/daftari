import { GroupRepository } from '../repositories/GroupRepository';
import { StudentRepository } from '../repositories/StudentRepository';
import { AttendanceRepository } from '../repositories/AttendanceRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { ClassroomRepository } from '../repositories/ClassroomRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { ClassroomService } from '../domain/services/ClassroomService';
import { supabase } from '../lib/supabase';
import { Group, Student, Payment, Expense } from '../types';
import { Classroom, Session } from '../domain/models';

const groupRepo = new GroupRepository();
const studentRepo = new StudentRepository();
const attendanceRepo = new AttendanceRepository();
const paymentRepo = new PaymentRepository();
const expenseRepo = new ExpenseRepository();
const classroomRepo = new ClassroomRepository();
const sessionRepo = new SessionRepository();
const classroomService = new ClassroomService(classroomRepo);

export const dbService = {
  classrooms: {
    subscribe: (userId: string, onData: (classrooms: Classroom[]) => void, onError: (err: Error) => void) => classroomRepo.subscribe(userId, onData, onError),
    add: (classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>) => classroomRepo.add(classroom),
    edit: (userId: string, id: string, classroom: Partial<Classroom>) => classroomRepo.edit(userId, id, classroom),
    delete: (userId: string, id: string) => classroomService.deleteClassroom(userId, id)
  },
  groups: {
    get: (groupId: string) => groupRepo.get(groupId),
    subscribe: (userId: string, onData: (groups: Group[]) => void, onError: (err: Error) => void) => groupRepo.subscribe(userId, onData, onError),
    add: (groupData: any) => groupRepo.add(groupData),
    edit: (userId: string, groupId: string, groupData: Partial<Group>) => groupRepo.edit(userId, groupId, groupData)
  },
  students: {
    subscribeAll: (userId: string, onData: (students: Student[]) => void, onError: (err: Error) => void) => studentRepo.subscribeAll(userId, onData, onError),
    subscribeByGroup: (userId: string, groupId: string, onData: (students: Student[]) => void, onError: (err: Error) => void) => studentRepo.subscribeByGroup(userId, groupId, onData, onError),
    add: (studentData: any) => studentRepo.add(studentData),
    edit: (userId: string, studentId: string, studentData: any) => studentRepo.edit(userId, studentId, studentData),
    update: (userId: string, studentId: string, updates: any) => studentRepo.update(userId, studentId, updates),
    confirmSession: (
      userId: string,
      groupId: string,
      sessionId: string,
      students: Student[],
      groupPaymentAmount: number,
      groupPaymentCycleSessions: number,
      draftAttendance: Record<string, 'present' | 'absent' | 'excused'>,
      draftPayment: Record<string, boolean>
    ) => attendanceRepo.confirmSession(userId, groupId, sessionId, students, groupPaymentAmount, groupPaymentCycleSessions, draftAttendance, draftPayment)
  },
  sessions: {
    getSessionsByGroup: (userId: string, groupId: string) => sessionRepo.getSessionsByGroup(userId, groupId),
    getSessionForToday: (userId: string, groupId: string) => sessionRepo.getSessionForToday(userId, groupId),
    createSession: (userId: string, groupId: string, date: string, notes?: string) => sessionRepo.createSession(userId, groupId, date, notes),
    updateSession: (sessionId: string, updates: Partial<Session>) => sessionRepo.updateSession(sessionId, updates),
    deleteSession: (sessionId: string) => sessionRepo.deleteSession(sessionId),
  },
  attendance: {
    getAttendanceBySession: (sessionId: string) => attendanceRepo.getAttendanceBySession(sessionId)
  },
  finance: {
    subscribePayments: (userId: string, groupId: string, onData: (payments: Payment[]) => void) => paymentRepo.subscribePayments(userId, groupId, onData),
    subscribeExpenses: (userId: string, groupId: string, onData: (expenses: Expense[]) => void) => expenseRepo.subscribeExpenses(userId, groupId, onData),
    subscribeGlobalPayments: (userId: string, onData: (payments: Payment[]) => void) => paymentRepo.subscribeGlobalPayments(userId, onData),
    subscribeGlobalExpenses: (userId: string, onData: (expenses: Expense[]) => void) => expenseRepo.subscribeGlobalExpenses(userId, onData),
    addExpense: (expenseData: any) => expenseRepo.addExpense(expenseData),
    deleteExpense: (userId: string, expenseId: string) => expenseRepo.deleteExpense(userId, expenseId)
  },
  activation: {
    activateProCode: async (userId: string, code: string) => {
      const { error } = await supabase.rpc('claim_activation_key', { key_input: code });
      if (error) {
        return { success: false, message: 'كود التفعيل غير صالح أو تم استخدامه مسبقاً' };
      }
      return { success: true, message: 'تم التفعيل بنجاح' };
    }
  },
  auth: {
    syncUser: async (currentUser: any) => {
      // The trigger public.handle_new_user() automatically handles syncing on auth.users insert,
      // using the REAL phone number registered during signup. The teacher row is therefore
      // guaranteed to exist by the time this runs.
      // SECURITY: we no longer insert a placeholder teacher with a fake TEMP-* phone number.
      // A fabricated phone number would let an anonymous actor fabricate identities (one account
      // per phone) and pollute activation-key/audit data. If the row is missing here, something
      // broke at the database level and the caller should surface the error instead of masking it.
      const { data, error } = await supabase.from('teachers').select('id').eq('id', currentUser.id).single();
      if (error && error.code === 'PGRST116') {
        throw new Error('خطأ في مزامنة الحساب: سجل الأستاذ غير موجود في قاعدة البيانات. تواصل مع الدعم.');
      }
    },
    subscribeToUserProfile: (uid: string, onData: (isPro: boolean) => void, onError: (err: Error) => void) => {
      const fetchAndSubscribe = async () => {
        try {
          const { data, error } = await supabase.from('teachers').select('is_pro').eq('id', uid).single();
          if (error) throw error;
          onData(data.is_pro);
        } catch (err: any) {
          console.error("Profile Error:", err);
          onError(err);
        }
      };
      
      fetchAndSubscribe();
      
      const subscription = supabase
        .channel(`teacher_profile_${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teachers', filter: `id=eq.${uid}` }, fetchAndSubscribe)
        .subscribe();
        
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }
};
