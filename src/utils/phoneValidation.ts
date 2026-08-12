/**
 * التحقق من صيغة رقم الهاتف الجزائري.
 *
 * القواعد المدعومة:
 * - الأرقام المحلية التي تبدأ بـ 0 تليها 5 أو 6 أو 7 (فاتح/موبيليس/دجيزي) ثم 8 أرقام.
 *   مثال: 0555123456 أو 0661234567 أو 0770123456
 * - الأرقام الدولية التي تبدأ بـ +213 تليها 5 أو 6 أو 7 ثم 9 أرقام.
 *   مثال: +213555123456
 * - يتم تجاهل المسافات والشرطة (-) تلقائياً.
 */

/**
 * يُرجع نسخة نظيفة من الرقم تبدأ بـ 0 أو null إذا كانت الصيغة غير صالحة نهائياً.
 */
export function normalizeAlgerianPhone(input: string): string | null {
  if (!input) return null;

  // إزالة المسافات والشرطة
  const cleaned = input.replace(/[\s\-]/g, '');

  let digits = cleaned;

  // معالجة الصيغة الدولية
  if (digits.startsWith('+213')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('213') && cleaned.length === 12) {
    digits = '0' + digits.slice(3);
  }

  // التحقق من الصيغة المحلية: 0[567] + 8 أرقام
  if (/^0[567]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * يتحقق من صيغة الرقم الجزائري ويرجع رسالة خطأ عربية واضحة أو null إذا كان صالحاً.
 */
export function validateAlgerianPhone(input: string): string | null {
  if (!input || !input.trim()) {
    return 'يرجى إدخال رقم الهاتف.';
  }
  const normalized = normalizeAlgerianPhone(input.trim());
  if (!normalized) {
    return 'رقم الهاتف غير صالح. يجب أن يكون جزائرياً بالصيغة 05/06/07 متبوعاً بـ 8 أرقام (مثال: 0555123456).';
  }
  return null;
}

/**
 * يتحقق من صيغة رقم هاتف تلميذ أو ولي أمر (اختياري عند الإدخال).
 */
export function validateOptionalAlgerianPhone(input: string): string | null {
  if (!input || !input.trim()) {
    return null;
  }
  return validateAlgerianPhone(input.trim());
}
