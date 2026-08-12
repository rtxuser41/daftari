export class StudentValidator {
  static validate(data: { fullName?: string; phoneNumber?: string }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data.fullName || data.fullName.trim().length < 3) {
      errors.push("اسم الطالب يجب أن يكون 3 أحرف على الأقل.");
    }
    if (data.phoneNumber && data.phoneNumber.trim() !== '') {
      const phoneRegex = /^[0-9+\s-]{8,15}$/;
      if (!phoneRegex.test(data.phoneNumber)) {
        errors.push("رقم هاتف الطالب غير صالح.");
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
