/**
 * ملاحظة أمنية مهمة:
 * هذا الـ hook هو طبقة تجربة مستخدم فقط (UX) لإظهار رسالة واضحة للأستاذ
 * قبل أن يحاول تنفيذ إجراء يتجاوز حدود الخطة المجانية.
 * هو ليس آلية الحماية الفعلية - تلك موجودة في قاعدة البيانات (Supabase RLS + Trigger
 * enforce_group_limit) والتي تُطبَّق بغض النظر عما تعرضه هذه الواجهة.
 * لا يجوز الاعتماد على هذا الملف وحده لمنع الوصول لأي ميزة مدفوعة.
 */
export const useProGuard = () => {
  const MAX_FREE_GROUPS = 1;

  const canAddGroup = (currentGroupCount: number, isPro: boolean): boolean => {
    if (isPro) return true;
    return currentGroupCount < MAX_FREE_GROUPS;
  };

  return {
    canAddGroup,
    MAX_FREE_GROUPS,
  };
};
