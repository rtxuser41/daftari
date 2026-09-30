import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { User, Phone, BookOpen, UserCircle2, LockKeyhole } from 'lucide-react';
import { validateAlgerianPhone, normalizeAlgerianPhone } from '../utils/phoneValidation';
import { isSupabaseConfigured } from '../lib/supabase';

type AuthMode = 'signup' | 'signin';
type FormData = { fullName: string; sex: string; subject: string; phoneNumber: string; password: string };

export default function Login() {
  const { loginUser, registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [mode, setMode] = useState<AuthMode>('signup');
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    sex: 'male',
    subject: '',
    phoneNumber: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || !isSupabaseConfigured) return;
    setIsLoading(true);
    setError('');

    const phoneError = validateAlgerianPhone(formData.phoneNumber);
    if (phoneError) {
      setError(phoneError);
      setIsLoading(false);
      return;
    }

    const phoneNumber = normalizeAlgerianPhone(formData.phoneNumber);
    if (!phoneNumber) {
      setError('رقم الهاتف غير صالح.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signin') {
        await loginUser(phoneNumber, formData.password);
      } else {
        await registerUser({ ...formData, phoneNumber });
      }
      navigate(from, { replace: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '';
      setError(message.startsWith('لم يبدأ الحساب جلسة دخول')
        ? message
        : mode === 'signin'
          ? 'تعذر تسجيل الدخول. تحقق من رقم الهاتف وكلمة المرور أو من حالة الاتصال.'
          : 'تعذر إنشاء الحساب. قد يكون الرقم مستخدماً من قبل أو أن خدمة الحساب غير متاحة.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAFAF8] font-cairo px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#0B2545]/5 rounded-full blur-3xl" aria-hidden="true" />

      <section className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100 relative z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          <Logo className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold mb-2 text-[#0B2545]">{mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h1>
          <p className="text-gray-500 font-medium text-center">
            {mode === 'signin' ? 'أدخل رقم الهاتف وكلمة المرور التي اخترتها عند إنشاء الحساب.' : 'أنشئ مساحتك التعليمية برقم هاتفك وكلمة مرور تختارها.'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div role="status" className="w-full bg-amber-50 text-amber-900 text-sm font-medium py-3 px-4 rounded-xl mb-6 text-center border border-amber-200">
            تسجيل الدخول وإنشاء الحساب متوقفان في هذه المعاينة لأن إعدادات Supabase غير متاحة. لم يتم إرسال أي بيانات.
          </div>
        )}

        {error && (
          <div role="alert" className="w-full bg-red-50 text-red-600 text-sm font-medium py-3 px-4 rounded-xl mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {mode === 'signin' && (
          <div role="note" className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
            الحسابات القديمة التي أُنشئت قبل اختيار كلمة مرور قد لا تملك كلمة مرور معروفة. استعادة هذه الحسابات عبر الرسائل النصية غير متاحة حالياً لعدم تهيئة خدمة SMS.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-bold text-[#0B2545] mb-2">الاسم الكامل</label>
                <div className="relative">
                  <User size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input id="fullName" type="text" required autoComplete="name" value={formData.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none" placeholder="الأستاذ محمد" />
                </div>
              </div>

              <div>
                <label htmlFor="sex" className="block text-sm font-bold text-[#0B2545] mb-2">الجنس</label>
                <div className="relative">
                  <UserCircle2 size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <select id="sex" value={formData.sex} onChange={(event) => updateField('sex', event.target.value)} className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none appearance-none">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-[#0B2545] mb-2">المادة المدرسة</label>
                <div className="relative">
                  <BookOpen size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input id="subject" type="text" required value={formData.subject} onChange={(event) => updateField('subject', event.target.value)} className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none" placeholder="الرياضيات، الفيزياء..." />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-bold text-[#0B2545] mb-2">رقم الهاتف</label>
            <div className="relative">
              <Phone size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input id="phoneNumber" type="tel" required dir="ltr" autoComplete="tel" value={formData.phoneNumber} onChange={(event) => updateField('phoneNumber', event.target.value)} className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pl-4 pr-10 text-left focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none" placeholder="0555 55 55 55" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-[#0B2545] mb-2">كلمة المرور</label>
            <div className="relative">
              <LockKeyhole size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input id="password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={formData.password} onChange={(event) => updateField('password', event.target.value)} className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none" placeholder="••••••••" />
            </div>
            {mode === 'signup' && <p className="text-xs text-gray-500 mt-2">اختر كلمة مرور لا تقل عن 8 أحرف واحفظها؛ ستحتاجها لتسجيل الدخول.</p>}
          </div>

          <button type="submit" disabled={isLoading || !isSupabaseConfigured} className="w-full flex items-center justify-center gap-2 bg-[#0B2545] text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-[#0a1f3a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
            {isLoading ? <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" aria-label="جاري التحميل" /> : mode === 'signin' ? 'دخول إلى حسابي' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} className="text-[#0B2545] font-bold underline underline-offset-4">
            {mode === 'signin' ? 'ليس لديك حساب؟ أنشئ حساباً' : 'لديك حساب بالفعل؟ سجّل الدخول'}
          </button>
          <p className="text-xs text-gray-500">استعادة كلمة المرور غير متاحة حالياً؛ الحساب يستخدم بريداً اصطناعياً ولا يمكنه استقبال رسائل الاستعادة.</p>
        </div>
      </section>
    </main>
  );
}
