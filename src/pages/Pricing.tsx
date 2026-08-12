import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShieldCheck, Key } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const { user, isPro, refreshProStatus } = useAuth();
  
  const [isActivationOpen, setIsActivationOpen] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');

  const handleUpgradeClick = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }
    setIsActivationOpen(true);
  };

  const handleActivate = async () => {
    if (!activationCode.trim() || !user) return;
    setIsActivating(true);
    setActivationError('');
    try {
      const result = await dbService.activation.activateProCode(user.uid, activationCode.trim());
      if (result.success) {
        await refreshProStatus();
        alert(result.message);
        setIsActivationOpen(false);
        navigate('/dashboard');
      } else {
        setActivationError(result.message);
      }
    } catch (err: any) {
      setActivationError('حدث خطأ أثناء الاتصال بالخادم. حاول مجدداً.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF8] text-[#0B2545] font-cairo">
      {/* Navbar Minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo className="w-10 h-10" />
              <span className="text-2xl font-bold tracking-tight">Daftari</span>
            </div>
            {!user ? (
              <button 
                onClick={() => navigate('/login')}
                className="font-bold px-6 py-2.5 text-[#0B2545] hover:bg-gray-100 rounded-xl transition-colors"
              >
                تسجيل الدخول
              </button>
            ) : (
              <button 
                onClick={() => navigate('/dashboard')}
                className="font-bold px-6 py-2.5 bg-gray-100 text-[#0B2545] hover:bg-gray-200 rounded-xl transition-colors"
              >
                لوحة التحكم
              </button>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            أسعار بسيطة، <span className="text-[#C5A059]">شفافة</span> ومناسبة
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            اختر الخطة التي تناسب حجم عملك. ابدأ مجاناً وقم بالترقية عندما تحتاج إلى المزيد.
          </p>

          <div className="mt-10 flex justify-center items-center gap-4">
            <span className={`font-bold ${!isAnnual ? 'text-[#0B2545]' : 'text-gray-400'}`}>شهري</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-16 h-8 bg-[#0B2545] rounded-full p-1 transition-colors"
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${!isAnnual ? 'translate-x-8' : 'translate-x-0'}`}></div>
            </button>
            <span className={`font-bold ${isAnnual ? 'text-[#0B2545]' : 'text-gray-400'} flex items-center gap-2`}>
              سنوي
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">وفر 20%</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-200 shadow-lg shadow-gray-200/20"
          >
            <h3 className="text-2xl font-bold mb-2">الخطة الأساسية</h3>
            <p className="text-gray-500 mb-6">للمعلمين المبتدئين أو لتجربة المنصة.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold">مجانًا</span>
            </div>
            <button 
              onClick={() => {
                if (!user) navigate('/login');
                else navigate('/dashboard');
              }}
              className="w-full py-4 rounded-2xl font-bold text-[#0B2545] bg-gray-100 hover:bg-gray-200 transition-colors mb-8"
            >
              {user ? 'انتقل إلى لوحة التحكم' : 'ابدأ الآن مجاناً'}
            </button>
            <div className="space-y-4">
              <FeatureItem text="مجموعة واحدة (1)" included />
              <FeatureItem text="عدد غير محدود من الطلاب داخل المجموعة" included />
              <FeatureItem text="تتبع الحضور والغياب" included />
              <FeatureItem text="إدارة المدفوعات الأساسية" included />
              <FeatureItem text="إدارة المصروفات (محدود)" included />
              <FeatureItem text="تصدير التقارير إلى Excel" included={false} />
              <FeatureItem text="دعم فني أولوية" included={false} />
            </div>
          </motion.div>

          {/* Pro Plan */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[#0B2545] text-white p-8 md:p-10 rounded-[2rem] border border-[#0B2545] shadow-2xl relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="absolute top-0 left-0 bg-[#C5A059] text-white font-bold px-4 py-1 rounded-br-2xl rounded-tl-2xl text-sm">
              الأكثر شعبية
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Daftari Pro</h3>
            <p className="text-blue-200 mb-6">للمعلمين المحترفين والمراكز التعليمية.</p>
            <div className="mb-8 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-[#C5A059]">
                {isAnnual ? '1,200' : '150'}
              </span>
              <span className="text-xl text-blue-200">د.ج / {isAnnual ? 'سنوياً' : 'شهرياً'}</span>
            </div>
            
            <button 
              onClick={handleUpgradeClick}
              disabled={isPro}
              className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg mb-8 ${isPro ? 'bg-green-500 text-white cursor-not-allowed shadow-green-500/20' : 'text-white bg-[#C5A059] hover:bg-[#B39050] shadow-[#C5A059]/20 hover:-translate-y-0.5'}`}
            >
              {isPro ? 'أنت مشترك بالفعل' : 'ادخال كود التفعيل'}
            </button>
            <div className="space-y-4">
              <FeatureItem text="مجموعات غير محدودة" included color="text-[#C5A059]" iconColor="text-[#C5A059]" />
              <FeatureItem text="طلاب غير محدودين" included color="text-white" iconColor="text-[#C5A059]" />
              <FeatureItem text="تتبع الحضور والغياب الشامل" included color="text-white" iconColor="text-[#C5A059]" />
              <FeatureItem text="إدارة المدفوعات المتقدمة" included color="text-white" iconColor="text-[#C5A059]" />
              <FeatureItem text="إحصائيات ورسوم بيانية مفصلة" included color="text-white" iconColor="text-[#C5A059]" />
              <FeatureItem text="تصدير التقارير إلى Excel" included color="text-white" iconColor="text-[#C5A059]" />
              <FeatureItem text="دعم فني أولوية (24/7)" included color="text-white" iconColor="text-[#C5A059]" />
            </div>
          </motion.div>
        </div>

        <div className="mt-20 text-center flex flex-col items-center justify-center gap-4">
          <ShieldCheck size={48} className="text-[#C5A059]" />
          <h4 className="text-2xl font-bold">دفع آمن وموثوق</h4>
          <p className="text-gray-500 max-w-lg">
            نحن نستخدم أحدث تقنيات التشفير لضمان أمان بياناتك ومدفوعاتك. يمكنك الإلغاء في أي وقت.
          </p>
        </div>
      </section>

      <AnimatePresence>
        {isActivationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-bold text-[#0B2545] flex items-center gap-2">
                  <Key size={24} className="text-[#C5A059]" />
                  تفعيل باقة Pro
                </h3>
                <button
                  onClick={() => setIsActivationOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    أدخل كود التفعيل الخاص بك
                  </label>
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="مثال: X7K9M2P4V8N5C1L3"
                    className="w-full text-center tracking-widest uppercase border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
                    dir="ltr"
                  />
                  {activationError && (
                    <p className="text-red-500 text-sm mt-2">{activationError}</p>
                  )}
                </div>

                <button
                  onClick={handleActivate}
                  disabled={isActivating || !activationCode}
                  className="w-full bg-[#0B2545] text-white font-bold py-3 rounded-xl hover:bg-[#0a1f3a] transition-colors disabled:opacity-50"
                >
                  {isActivating ? 'جاري التحقق...' : 'تفعيل الحساب'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureItem({ text, included, color = "text-gray-700", iconColor = "text-green-500" }: { text: string, included: boolean, color?: string, iconColor?: string }) {
  return (
    <div className={`flex items-center gap-3 ${!included ? 'opacity-50' : ''}`}>
      {included ? (
        <Check size={20} className={iconColor} />
      ) : (
        <X size={20} className="text-gray-400" />
      )}
      <span className={color}>{text}</span>
    </div>
  );
}
