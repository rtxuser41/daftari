import { supabase } from '../lib/supabase';
import { Session } from '../domain/models';

export class SessionRepository {
  async getSessionsByGroup(userId: string, groupId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_id', userId)
      .eq('group_id', groupId)
      
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      userId: d.teacher_id,
      groupId: d.group_id,
      date: d.date,
      confirmedAt: d.confirmed_at,
      notes: d.notes,
      createdAt: d.created_at,
    }));
  }

  async getSessionForToday(userId: string, groupId: string): Promise<Session | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_id', userId)
      .eq('group_id', groupId)
      .gte('date', today.toISOString())
      .lt('date', tomorrow.toISOString())
      
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST error for single() returning no rows
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.teacher_id,
      groupId: data.group_id,
      date: data.date,
      confirmedAt: data.confirmed_at,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  async createSession(userId: string, groupId: string, date: string, notes?: string): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        teacher_id: userId,
        group_id: groupId,
        date: date,
        notes: notes,
        confirmed_at: null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.teacher_id,
      groupId: data.group_id,
      date: data.date,
      confirmedAt: data.confirmed_at,
      notes: data.notes,
      createdAt: data.created_at,
    };
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({
        notes: updates.notes,
        confirmed_at: updates.confirmedAt,
      })
      .eq('id', sessionId);
    if (error) throw error;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
  }
}
