import { supabase } from '../lib/supabase';
import { IStudentRepository } from '../domain/repositories/interfaces';
import { Student } from '../domain/models';

export class StudentRepository implements IStudentRepository {
  subscribeAll(userId: string, onData: (students: Student[]) => void, onError: (err: Error) => void): () => void {
    const fetchAndSubscribe = async () => {
      try {
        let query = supabase
          .from('students')
          .select('*')
          .eq('teacher_id', userId)
          .eq('is_deleted', false);

 

        const [studentsRes, debtRes] = await Promise.all([
          query,
          supabase.from('student_debt_summary').select('student_id, session_balance').eq('teacher_id', userId)
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (debtRes.error) throw debtRes.error;

        const debtMap = new Map(debtRes.data.map(d => [d.student_id, d.session_balance]));

        // map db rows to Student
        const students = studentsRes.data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: d.group_id,
          fullName: d.full_name,
          phoneNumber: d.phone_number,
          parentPhone: d.parent_phone,
          notes: d.notes,
          customPrice: d.custom_price,
          joiningDate: d.joining_date,
          isDeleted: d.is_deleted,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          sessionBalance: debtMap.get(d.id) || 0
          // remaining legacy fields are not mapped if they don't exist in Supabase schema
        })) as Student[];
        onData(students);
      } catch (err: any) {
        console.error("Repo Error:", err); onError(err);
      }

    };
    
    fetchAndSubscribe();

    const filterString = `teacher_id=eq.${userId}`; 
    
    

    const subscription = supabase
      .channel(`students_all_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: filterString }, fetchAndSubscribe)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  subscribeByGroup(userId: string, groupId: string, onData: (students: Student[]) => void, onError: (err: Error) => void): () => void {
    const fetchAndSubscribe = async () => {
      try {
        const [studentsRes, debtRes] = await Promise.all([
          supabase
            .from('students')
            .select('*')
            .eq('teacher_id', userId)
            .eq('group_id', groupId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('student_debt_summary')
            .select('student_id, session_balance')
            .eq('teacher_id', userId)
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (debtRes.error) throw debtRes.error;

        const debtMap = new Map(debtRes.data.map(d => [d.student_id, d.session_balance]));

        const students = studentsRes.data.map(d => ({
          id: d.id,
          userId: d.teacher_id,
          groupId: d.group_id,
          fullName: d.full_name,
          phoneNumber: d.phone_number,
          parentPhone: d.parent_phone,
          notes: d.notes,
          customPrice: d.custom_price,
          joiningDate: d.joining_date,
          isDeleted: d.is_deleted,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          sessionBalance: debtMap.get(d.id) || 0
        })) as Student[];
        onData(students);
      } catch (err: any) {
        console.error("Repo Error:", err); onError(err);
      }

    };
    
    fetchAndSubscribe();

    const subscription = supabase
      .channel(`students_group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `group_id=eq.${groupId}` }, fetchAndSubscribe)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  async add(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('students')
      .insert({
        teacher_id: studentData.userId,
        group_id: studentData.groupId,
        full_name: studentData.fullName,
        phone_number: studentData.phoneNumber,
        parent_phone: studentData.parentPhone,
        notes: studentData.notes,
        custom_price: studentData.customPrice,
        joining_date: studentData.joiningDate,
        is_deleted: studentData.isDeleted ? true : false,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async edit(userId: string, studentId: string, studentData: Partial<Student>): Promise<void> {
    const { error } = await supabase
      .from('students')
      .update({
        full_name: studentData.fullName,
        phone_number: studentData.phoneNumber,
        parent_phone: studentData.parentPhone,
        notes: studentData.notes,
        custom_price: studentData.customPrice,
        joining_date: studentData.joiningDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .eq('teacher_id', userId);

    if (error) throw error;
  }

  async update(userId: string, studentId: string, updates: Partial<Student>): Promise<void> {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (updates.isDeleted !== undefined) {
      updatePayload.is_deleted = updates.isDeleted ? true : false;
    }
    if (updates.fullName !== undefined) updatePayload.full_name = updates.fullName;
    if (updates.phoneNumber !== undefined) updatePayload.phone_number = updates.phoneNumber;
    if (updates.parentPhone !== undefined) updatePayload.parent_phone = updates.parentPhone;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.customPrice !== undefined) updatePayload.custom_price = updates.customPrice;
    if (updates.joiningDate !== undefined) updatePayload.joining_date = updates.joiningDate;

    const { error } = await supabase
      .from('students')
      .update(updatePayload)
      .eq('id', studentId)
      .eq('teacher_id', userId);

    if (error) throw error;
  }
}
