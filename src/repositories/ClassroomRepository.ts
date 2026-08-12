import { supabase } from '../lib/supabase';
import { IClassroomRepository } from '../domain/repositories/interfaces';
import { Classroom } from '../domain/models';

export class ClassroomRepository implements IClassroomRepository {
  subscribe(userId: string, onData: (classrooms: Classroom[]) => void, onError: (err: Error) => void): () => void {
    const fetchAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('*')
          .eq('teacher_id', userId)
          
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const classrooms = data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          name: d.name,
          capacity: d.capacity,
          monthlyRent: d.monthly_rent,
          address: d.address,
          notes: d.notes,
          color: d.color,
          isActive: d.is_active,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        })) as Classroom[];
        
        onData(classrooms);
      } catch (err: any) {
        console.error("Repo Error:", err); onError(err);
      }
    };
    
    fetchAndSubscribe();

    const subscription = supabase
      .channel(`classrooms_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms', filter: `teacher_id=eq.${userId}` }, fetchAndSubscribe)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  async add(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: classroom.userId,
        name: classroom.name,
        capacity: classroom.capacity,
        monthly_rent: classroom.monthlyRent,
        address: classroom.address,
        notes: classroom.notes,
        color: classroom.color,
        is_active: classroom.isActive
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async edit(userId: string, id: string, classroom: Partial<Classroom>): Promise<void> {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (classroom.name !== undefined) updatePayload.name = classroom.name;
    if (classroom.capacity !== undefined) updatePayload.capacity = classroom.capacity;
    if (classroom.monthlyRent !== undefined) updatePayload.monthly_rent = classroom.monthlyRent;
    if (classroom.address !== undefined) updatePayload.address = classroom.address;
    if (classroom.notes !== undefined) updatePayload.notes = classroom.notes;
    if (classroom.color !== undefined) updatePayload.color = classroom.color;
    if (classroom.isActive !== undefined) updatePayload.is_active = classroom.isActive;

    const { error } = await supabase
      .from('classrooms')
      .update(updatePayload)
      .eq('id', id)
      .eq('teacher_id', userId);

    if (error) throw error;
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', id)
      .eq('teacher_id', userId);

    if (error) throw error;
  }
}
