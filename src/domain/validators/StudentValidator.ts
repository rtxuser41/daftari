export class StudentValidator {
  static validate(data: { fullName?: string; phoneNumber?: string }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data.fullName || data.fullName.trim().length < 3) {
      errors.push("اسم الطالب يجب أن يكون 3 أحرف على الأقل.");
    }
    if (data.phoneNumber && data.phoneNumber.trim() !== '') {
      // التحقق من صيغة الرقم الجزائري: 0[567]XXXXXXXX أو +2135/6/7XXXXXXXXX
      const clean = data.phoneNumber.replace(/[\s-]/g, '');
      const algerianRegex = /^(0[567][0-9]{8}|\+213[567][0-9]{9})$/;
      if (!algerianRegex.test(clean)) {
        errors.push("رقم هاتف الطالب غير صالح. يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام.");
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
