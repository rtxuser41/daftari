export class GroupValidator {
  static validate(data: { name?: string; price?: number }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data.name || data.name.trim().length < 2) {
      errors.push("اسم المجموعة يجب أن يكون حرفين على الأقل.");
    }
    if (data.price !== undefined && data.price < 0) {
      errors.push("سعر المجموعة لا يمكن أن يكون سالباً.");
    }
    return { valid: errors.length === 0, errors };
  }
}
