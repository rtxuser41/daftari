import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { ChevronRight, LogOut, MessageCircle, User as UserIcon, Star, Key, CheckCircle, AlertCircle, Moon, Globe, Banknote, CloudUpload, Archive } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Settings() {
  const { user, isPro, logout, refreshProStatus } = useAuth();
  const navigate = useNavigate();
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleActivate = async () => {
    if (!activationCode.trim() || !user) return;
    setIsLoading(true);
    setMessage(null);
    const result = await dbService.activation.activateProCode(user.uid, activationCode.trim());
    setMessage({ text: result.message, type: result.success ? 'success' : 'error' });
    if (result.success) {
      setActivationCode('');
      // تحديث حالة Pro من قاعدة البيانات فوراً حتى تظهر مزايا النسخة الاحترافية دون إعادة تسجيل الدخول
      await refreshProStatus();
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20">
      {/* SliverAppBar Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 backdrop-blur-md pt-6 pb-4 border-b border-gray-200">
        <div className="px-4 flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-gray-500 hover:text-[#0B2545] transition-colors rounded-full active:bg-gray-100">
            <ChevronRight className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-[#0B2545]">الإعدادات</h1>
          <div className="w-10 flex justify-end">
            <Logo className="w-8 h-8" />
          </div>
        </div>
      </header>

      <main className="px-4 py-8 max-w-lg mx-auto space-y-8">
        {/* Profile Section */}
        <section className="bg-cream rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-[#0B2545]/5 text-[#0B2545] rounded-full flex items-center justify-center flex-shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserIcon className="w-7 h-7" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#0B2545]">{user?.displayName || 'المستخدم'}</h2>
            <p className="text-sm text-gray-500">{user?.email || 'حساب الضيف'}</p>
          </div>
          {isPro && (
             <div className="bg-[#C5A059]/10 text-[#C5A059] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
               <Star className="w-3 h-3 fill-current" />
               PRO
             </div>
          )}
        </section>

        {/* Premium Section */}
        {!isPro ? (
          <section className="relative overflow-hidden bg-gradient-to-br from-[#0B2545] to-[#123b6e] rounded-2xl p-6 shadow-xl border border-[#C5A059]/20">
            {/* Decorative background element */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-[#C5A059] fill-[#C5A059]" />
                <h3 className="text-lg font-bold text-white">النسخة المجانية محدودة</h3>
              </div>
              <p className="text-[#FAF9F6]/80 text-sm leading-relaxed mb-4">
                أنت حالياً تستخدم النسخة المجانية والتي تتيح لك إدارة مجموعة واحدة (1) بحد أقصى، مع عدد غير محدود من الطلاب داخل المجموعة.
              </p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-white/5">
                <div className="space-y-1">
                  <label className="text-xs text-white/70 font-medium">كود التفعيل (Activation Code)</label>
                  <div className="relative">
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]" />
                    <input
                      type="text"
                      className="w-full bg-black/20 border-white/10 text-white rounded-lg py-2.5 pr-10 pl-4 focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all placeholder:text-white/30 text-left"
                      placeholder="XXXX-XXXX-XXXX"
                      dir="ltr"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <button
                  onClick={handleActivate}
                  disabled={isLoading || !activationCode.trim()}
                  className="w-full py-3 bg-[#C5A059] hover:bg-[#b08d4d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? 'جاري التفعيل...' : 'تفعيل النسخة الاحترافية'}
                </button>

                {message && (
                  <div className={`flex items-start gap-2 text-sm mt-3 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                    <span>{message.text}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-gradient-to-r from-[#C5A059]/10 to-transparent rounded-2xl p-6 border border-[#C5A059]/20 flex items-start gap-4">
            <div className="min-w-fit mt-1">
              <Star className="w-6 h-6 text-[#C5A059] fill-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B2545] mb-1">النسخة الاحترافية نشطة</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                شكراً لاشتراكك! يمكنك الآن إضافة عدد غير محدود من الأفواج والطلاب، والاستفادة من كافة الميزات.
              </p>
            </div>
          </section>
        )}

        {/* Preferences Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">التفضيلات</h3>
          <div className="bg-cream rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {/* Dark Mode */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0B2545]/5 flex items-center justify-center text-[#0B2545]">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0B2545]">الوضع الليلي</h4>
                  <p className="text-xs text-gray-500">تغيير مظهر التطبيق</p>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${darkMode ? 'bg-[#0B2545]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-cream transition-transform ${darkMode ? 'right-7' : 'right-1'}`} />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0B2545]">اللغة</h4>
                  <p className="text-xs text-gray-500">لغة واجهة المستخدم</p>
                </div>
              </div>
              <select className="bg-cream border border-gray-100 text-sm font-medium rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] py-2 px-3 pr-8 text-[#0B2545] outline-none appearance-none cursor-pointer">
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0B2545]">العملة</h4>
                  <p className="text-xs text-gray-500">العملة الافتراضية للمعاملات</p>
                </div>
              </div>
              <div className="relative">
                <select className="bg-cream border border-gray-100 text-sm font-medium rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:border-[#0B2545] py-2 px-3 pr-8 text-[#0B2545] outline-none appearance-none cursor-pointer text-left" dir="ltr">
                  <option value="dzd">دج</option>
                  <option value="eur">€</option>
                  <option value="usd">$</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management Section */}

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">إدارة البيانات</h3>
          <div className="bg-cream rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {/* Manual Cloud Sync */}
            <button className="w-full flex items-center gap-4 p-4 hover:bg-cream transition-colors active:bg-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div className="flex-1 text-right">
                <h4 className="text-sm font-bold text-[#0B2545]">مزامنة سحابية يدوية</h4>
                <p className="text-xs text-gray-500">مزامنة البيانات المحلية مع الخادم</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">الدعم والمساعدة</h3>
          <div className="bg-cream rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <a
              href="https://wa.me/213660946472"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 hover:bg-cream transition-colors active:bg-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800">تواصل مع الدعم للترقية</h4>
                <p className="text-xs text-gray-500">للحصول على كود التفعيل وأي استفسارات</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </a>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-cream rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-red-100 overflow-hidden mb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors active:bg-red-100 text-red-500"
          >
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="flex-1 text-right">
              <h4 className="text-sm font-bold">تسجيل الخروج</h4>
            </div>
          </button>
        </div>

      </main>
    </div>
  );
}
