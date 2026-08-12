import { supabase } from '../lib/supabase';
import { IAttendanceRepository } from '../domain/repositories/interfaces';
import { Student } from '../domain/models';

export class AttendanceRepository implements IAttendanceRepository {
  async getAttendanceBySession(sessionId: string): Promise<Record<string, string>> {
    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('session_id', sessionId);
      
    if (error) throw error;
    
    const result: Record<string, string> = {};
    if (data) {
      data.forEach(row => {
        result[row.student_id] = row.status;
      });
    }
    return result;
  }

  async confirmSession(
    userId: string,
    groupId: string,
    sessionId: string,
    students: Student[],
    groupPaymentAmount: number,
    groupPaymentCycleSessions: number,
    draftAttendance: Record<string, 'present' | 'absent' | 'excused'>,
    draftPayment: Record<string, boolean>
  ): Promise<void> {
    const activeStudents = students.filter(s => !s.isDeleted);
    
    // Begin Supabase transaction-like approach or parallel inserts
    // 1. Update the session to confirmed
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        confirmed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    // 2. Prepare attendance & payment records
    const attendanceRecords = [];
    const paymentRecords = [];

    for (const student of activeStudents) {
      const status = draftAttendance[student.id!] ?? 'present';
      const isPaid = draftPayment[student.id!] === true;

      attendanceRecords.push({
        teacher_id: userId,
        session_id: sessionId,
        student_id: student.id,
        status: status
      });

      if (isPaid) {
        const amountToPay = student.customPrice ?? groupPaymentAmount;
        paymentRecords.push({
          teacher_id: userId,
          student_id: student.id,
          group_id: groupId,
          amount: amountToPay,
          payment_cycle_sessions: groupPaymentCycleSessions,
          paid_at: new Date().toISOString()
        });
      }
    }

    if (attendanceRecords.length > 0) {
      const { error } = await supabase.from('attendance').insert(attendanceRecords);
      if (error) throw error;
    }

    if (paymentRecords.length > 0) {
      const { error } = await supabase.from('payments').insert(paymentRecords);
      if (error) throw error;
    }
  }
}
