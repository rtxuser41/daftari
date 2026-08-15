import { supabase } from '../lib/supabase';
import { ITeacherRepository } from '../domain/repositories/interfaces';
import { Teacher } from '../domain/models';

export class TeacherRepository implements ITeacherRepository {
  async getTeacher(userId: string): Promise<Teacher | null> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phoneNumber: data.phone_number,
      isPro: data.is_pro === true,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as Teacher;
  }

  async updateTeacher(userId: string, teacherData: Partial<Teacher>): Promise<void> {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (teacherData.fullName !== undefined) updatePayload.full_name = teacherData.fullName;
    if (teacherData.phoneNumber !== undefined) updatePayload.phone_number = teacherData.phoneNumber;

    const { error } = await supabase
      .from('teachers')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * تفعيل اشتراك Pro عبر مفتاح تفعيل.
   * التحقق الفعلي والآمن يتم بالكامل داخل قاعدة البيانات (RPC claim_activation_key)،
   * وليس في الواجهة، حتى لا يكون قابلاً للتجاوز.
   */
  async activateProKey(activationKey: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase.rpc('claim_activation_key', {
      key_input: activationKey.trim().toUpperCase(),
    });

    if (error) {
      return { success: false, message: error.message || 'مفتاح غير صالح أو مستخدم من قبل' };
    }
    return { success: true, message: 'تم تفعيل الاشتراك بنجاح' };
  }
}
