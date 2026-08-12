import { IClassroomRepository } from '../repositories/interfaces';
import { Classroom } from '../models';
import { supabase } from '../../lib/supabase';

export class ClassroomService {
  constructor(private classroomRepo: IClassroomRepository) {}

  async deleteClassroom(userId: string, classroomId: string): Promise<void> {
    // Check if classroom is used by any group
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('teacher_id', userId)
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      throw new Error("Cannot delete classroom because it is currently used by one or more groups.");
    }

    await this.classroomRepo.delete(userId, classroomId);
  }
}
