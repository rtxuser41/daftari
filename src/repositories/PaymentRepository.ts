import { supabase } from '../lib/supabase';
import { IPaymentRepository } from '../domain/repositories/interfaces';
import { Payment } from '../domain/models';

export class PaymentRepository implements IPaymentRepository {
  subscribeGlobalPayments(userId: string, onData: (payments: Payment[]) => void): () => void {
    const fetchAndSubscribe = async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .eq('teacher_id', userId)
        ;
      
      const { data, error } = await query;
      
      if (!error && data) {
        onData(data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: d.group_id,
          studentId: d.student_id,
          amount: d.amount,
          paymentCycleSessions: d.payment_cycle_sessions,
          paidAt: d.paid_at,
          createdAt: d.created_at
        })) as Payment[]);
      }
    };
    
    fetchAndSubscribe();
    
    const filterString = `teacher_id=eq.${userId}`;       
    const sub = supabase.channel(`payments_all_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: filterString }, fetchAndSubscribe)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }

  subscribePayments(userId: string, groupId: string, onData: (payments: Payment[]) => void): () => void {
    const fetchAndSubscribe = async () => {
      const { data: students, error: studentError } = await supabase.from('students').select('id').eq('group_id', groupId);
      if (studentError || !students) return;
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) {
        onData([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('student_id', studentIds)
        ;

      if (!error && data) {
        onData(data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: groupId,
          studentId: d.student_id,
          amount: d.amount,
          paymentCycleSessions: d.payment_cycle_sessions,
          paidAt: d.paid_at,
          createdAt: d.created_at
        })) as Payment[]);
      }
    };
    
    fetchAndSubscribe();
    const sub = supabase.channel(`payments_group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `teacher_id=eq.${userId}` }, fetchAndSubscribe)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }
}
