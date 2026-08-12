import { supabase } from '../lib/supabase';
import { ISettingsRepository } from '../domain/repositories/interfaces';
import { Settings } from '../domain/models';

export class SettingsRepository implements ISettingsRepository {
  async getSettings(userId: string): Promise<Settings | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('teacher_id', userId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.teacher_id,
      theme: data.theme,
      language: data.language,
      currency: data.currency,
      defaultPaymentCycle: data.default_payment_cycle
    } as Settings;
  }

  async updateSettings(userId: string, settings: Partial<Settings>): Promise<void> {
    const { data: existing } = await supabase.from('settings').select('id').eq('teacher_id', userId).single();
    
    if (existing) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (settings.theme) updatePayload.theme = settings.theme;
      if (settings.language) updatePayload.language = settings.language;
      if (settings.currency) updatePayload.currency = settings.currency;
      if (settings.defaultPaymentCycle) updatePayload.default_payment_cycle = settings.defaultPaymentCycle;

      await supabase.from('settings').update(updatePayload).eq('teacher_id', userId);
    } else {
      await supabase.from('settings').insert({
        teacher_id: userId,
        theme: settings.theme || 'system',
        language: settings.language || 'ar',
        currency: settings.currency || 'DZD',
        default_payment_cycle: settings.defaultPaymentCycle || 4
      });
    }
  }
}
