import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { User, Phone, BookOpen, UserCircle2 } from 'lucide-react';

export default function Login() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [formData, setFormData] = useState({
    fullName: '',
    sex: 'male',
    subject: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await registerUser(formData);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب. تأكد من إدخال بيانات صحيحة.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAFAF8] font-cairo px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-[#0B2545]/5 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-xl border border-gray-100 relative z-10">
        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Logo className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold mb-2 text-[#0B2545]">مرحباً بك</h1>
          <p className="text-gray-500 font-medium text-center">أدخل بياناتك لإنشاء مساحتك التعليمية</p>
        </div>

        {error && (
          <div className="w-full bg-red-50 text-red-600 text-sm font-medium py-3 px-4 rounded-xl mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#0B2545] mb-2">الاسم الكامل</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none"
                placeholder="الأستاذ محمد"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0B2545] mb-2">الجنس</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <UserCircle2 size={20} />
              </div>
              <select
                value={formData.sex}
                onChange={e => setFormData({...formData, sex: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none appearance-none"
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0B2545] mb-2">المادة المدرسة</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <BookOpen size={20} />
              </div>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pr-10 pl-4 focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none"
                placeholder="الرياضيات، الفيزياء..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#0B2545] mb-2">رقم الهاتف</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={20} />
              </div>
              <input
                type="tel"
                required
                dir="ltr"
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 text-[#0B2545] rounded-xl py-3 pl-4 pr-10 text-left focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] transition-all outline-none"
                placeholder="0555 55 55 55"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#0B2545] text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-[#0a1f3a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'بدء الاستخدام'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
