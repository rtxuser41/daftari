import { supabase } from '../lib/supabase';
import { IExpenseRepository } from '../domain/repositories/interfaces';
import { Expense } from '../domain/models';

export class ExpenseRepository implements IExpenseRepository {
  subscribeGlobalExpenses(userId: string, onData: (expenses: Expense[]) => void): () => void {
    const fetchAndSubscribe = async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('teacher_id', userId)
        ;

      const { data, error } = await query;
      if (!error && data) {
        onData(data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: d.group_id,
          description: d.description,
          amount: d.amount,
          date: d.date,
          createdAt: d.created_at
        })) as Expense[]);
      }
    };
    
    fetchAndSubscribe();
    
    const filterString = `teacher_id=eq.${userId}`;       
    const sub = supabase.channel(`expenses_all_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: filterString }, fetchAndSubscribe)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }

  subscribeExpenses(userId: string, groupId: string, onData: (expenses: Expense[]) => void): () => void {
    const fetchAndSubscribe = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('teacher_id', userId)
        .eq('group_id', groupId)
        
        .order('date', { ascending: false });

      if (!error && data) {
        onData(data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: d.group_id,
          description: d.description,
          amount: d.amount,
          date: d.date,
          createdAt: d.created_at
        })) as Expense[]);
      }
    };
    
    fetchAndSubscribe();
    const sub = supabase.channel(`expenses_group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` }, fetchAndSubscribe)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }

  async addExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .insert({
        teacher_id: expenseData.userId,
        group_id: expenseData.groupId,
        description: expenseData.description,
        amount: expenseData.amount,
        date: expenseData.date
      });
    if (error) throw error;
  }

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('teacher_id', userId);
    if (error) throw error;
  }
}
