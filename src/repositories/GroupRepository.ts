import { supabase } from '../lib/supabase';
import { IGroupRepository } from '../domain/repositories/interfaces';
import { Group } from '../domain/models';

export class GroupRepository implements IGroupRepository {
  async get(groupId: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.teacher_id,
      classroomId: data.classroom_id,
      subject: data.subject_id, // we might need mapping
      name: data.name,
      level: data.level,
      educationalLevel: data.educational_level,
      studyStream: data.study_stream,
      color: data.color,
      sessionsPerMonth: data.sessions_per_month,
      price: data.price,
      capacity: data.capacity,
      timings: typeof data.timings === 'string' ? JSON.parse(data.timings) : data.timings,
      studentCount: 0, // This should technically come from a count
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as Group;
  }

  subscribe(userId: string, onData: (groups: Group[]) => void, onError: (err: Error) => void): () => void {
    const fetchAndSubscribe = async () => {
      try {
        let query = supabase
          .from('groups')
          .select('*')
          .eq('teacher_id', userId)
          
          .order('name');
          
 

        const { data, error } = await query;

        if (error) throw error;
        const groups = data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          classroomId: d.classroom_id,
          name: d.name,
          level: d.level,
          educationalLevel: d.educational_level,
          studyStream: d.study_stream,
          color: d.color,
          sessionsPerMonth: d.sessions_per_month,
          price: d.price,
          capacity: d.capacity,
          timings: typeof d.timings === 'string' ? JSON.parse(d.timings) : d.timings,
          studentCount: 0, 
          createdAt: d.created_at,
          updatedAt: d.updated_at
        })) as Group[];
        onData(groups);
      } catch (err: any) {
        console.error("Repo Error:", err); onError(err);
      }
    };
    
    fetchAndSubscribe();

    const filterString = `teacher_id=eq.${userId}`; 
    
    

    const subscription = supabase
      .channel(`groups_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: filterString }, fetchAndSubscribe)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  async add(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        teacher_id: groupData.userId,
        classroom_id: groupData.classroomId || null,
        name: groupData.name,
        level: groupData.level,
        educational_level: groupData.educationalLevel,
        study_stream: groupData.studyStream,
        color: groupData.color,
        sessions_per_month: groupData.sessionsPerMonth,
        price: groupData.price,
        capacity: groupData.capacity,
        timings: groupData.timings,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async edit(userId: string, groupId: string, groupData: Partial<Group>): Promise<void> {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (groupData.name !== undefined) updatePayload.name = groupData.name;
    if (groupData.level !== undefined) updatePayload.level = groupData.level;
    if (groupData.educationalLevel !== undefined) updatePayload.educational_level = groupData.educationalLevel;
    if (groupData.studyStream !== undefined) updatePayload.study_stream = groupData.studyStream;
    if (groupData.color !== undefined) updatePayload.color = groupData.color;
    if (groupData.sessionsPerMonth !== undefined) updatePayload.sessions_per_month = groupData.sessionsPerMonth;
    if (groupData.price !== undefined) updatePayload.price = groupData.price;
    if (groupData.capacity !== undefined) updatePayload.capacity = groupData.capacity;
    if (groupData.timings !== undefined) updatePayload.timings = groupData.timings;
    if (groupData.classroomId !== undefined) updatePayload.classroom_id = groupData.classroomId;

    const { error } = await supabase
      .from('groups')
      .update(updatePayload)
      .eq('id', groupId)
      .eq('teacher_id', userId);

    if (error) throw error;
  }
}
