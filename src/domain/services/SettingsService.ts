import { ISettingsRepository } from '../repositories/interfaces';
import { Settings } from '../models';

export class SettingsService {
  constructor(private settingsRepo: ISettingsRepository) {}

  async getSettings(userId: string): Promise<Settings | null> {
    return this.settingsRepo.getSettings(userId);
  }

  async updateSettings(userId: string, updates: Partial<Settings>): Promise<void> {
    if (updates.defaultPaymentCycle !== undefined && updates.defaultPaymentCycle <= 0) {
      throw new Error('Default payment cycle must be greater than zero.');
    }
    
    await this.settingsRepo.updateSettings(userId, updates);
  }
}
