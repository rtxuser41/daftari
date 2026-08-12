import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowLeft, Users, Calendar, DollarSign, PieChart, Shield } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF8] text-[#0B2545] font-cairo selection:bg-[#C5A059]/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <span className="text-2xl font-bold tracking-tight">Daftari</span>
            </div>
            <div className="hidden md:flex gap-8 font-medium">
              <a href="#features" className="hover:text-[#C5A059] transition-colors">المميزات</a>
              <a href="#testimonials" className="hover:text-[#C5A059] transition-colors">آراء العملاء</a>
              <button onClick={() => navigate('/pricing')} className="hover:text-[#C5A059] transition-colors">الأسعار</button>
            </div>
            <div className="flex gap-4">
              {user ? (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="font-bold px-6 py-2.5 bg-[#0B2545] text-white rounded-xl hover:bg-[#0B2545]/90 transition-colors shadow-sm"
                >
                  لوحة التحكم
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/login')}
                    className="font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    دخول
                  </button>
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="font-bold px-6 py-2.5 bg-[#C5A059] text-white rounded-xl hover:bg-[#C5A059]/90 transition-colors shadow-sm"
                  >
                    ابدأ مجاناً
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C5A059]/10 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-[#C5A059]/10 text-[#C5A059] font-bold text-sm mb-6 border border-[#C5A059]/20">
              🌟 المنصة رقم #1 لإدارة الدروس الخصوصية
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
              إدارة <span className="text-[#C5A059]">مجموعاتك</span> وطلابك<br/>
              بسهولة واحترافية
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              تطبيق متكامل لتتبع الحضور، إدارة الاشتراكات، وتنظيم الجداول. وفر وقتك وركز على ما تجيده حقاً: التعليم.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate(user ? '/dashboard' : '/pricing')}
                className="flex items-center justify-center gap-2 font-bold px-8 py-4 bg-[#0B2545] text-white rounded-2xl hover:bg-[#0B2545]/90 transition-all shadow-xl shadow-[#0B2545]/20 text-lg hover:-translate-y-1"
              >
                {user ? 'انتقل إلى لوحة التحكم' : 'ابدأ الآن مجاناً'}
                <ArrowLeft size={20} />
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="font-bold px-8 py-4 bg-white text-[#0B2545] border-2 border-gray-200 rounded-2xl hover:border-[#C5A059] hover:bg-[#C5A059]/5 transition-all text-lg"
              >
                اكتشف المميزات
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-xl text-gray-600">أدوات متطورة صممت خصيصاً للمعلمين والمراكز التعليمية</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Users size={32} className="text-[#C5A059]" />}
              title="إدارة الطلاب والمجموعات"
              description="أضف مجموعات غير محدودة وطلابك بضغطة زر. تتبع بياناتهم وأرقام هواتفهم للتواصل السريع."
            />
            <FeatureCard 
              icon={<Calendar size={32} className="text-[#C5A059]" />}
              title="تتبع الحضور والغياب"
              description="تسجيل الحضور عبر السحب (Swipe) أو الضغط. تقارير دقيقة لمعرفة التزام كل طالب."
            />
            <FeatureCard 
              icon={<DollarSign size={32} className="text-[#C5A059]" />}
              title="نظام مالي متكامل"
              description="إدارة الاشتراكات الشهرية، المدفوعات الجزئية، تتبع الديون، والمصروفات بكل دقة."
            />
            <FeatureCard 
              icon={<PieChart size={32} className="text-[#C5A059]" />}
              title="تقارير وإحصائيات"
              description="لوحة تحكم تعطيك نظرة شاملة عن أرباحك، عدد طلابك، والمجموعات النشطة."
            />
            <FeatureCard 
              icon={<CheckCircle2 size={32} className="text-[#C5A059]" />}
              title="إدارة القاعات الأكاديمية"
              description="تنظيم وتعيين القاعات، تكلفة الإيجار، وتجنب التعارض في المواعيد بسهولة."
            />
            <FeatureCard 
              icon={<Shield size={32} className="text-[#C5A059]" />}
              title="حماية سحابية لبياناتك"
              description="جميع بياناتك محفوظة بأمان تام ويمكنك الوصول إليها من أي جهاز في أي وقت."
            />
          </div>
        </div>
      </section>

      {/* Social Proof / CTA */}
      <section className="py-24 bg-[#0B2545] text-white text-center px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] opacity-20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-20 blur-[100px] rounded-full"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">جاهز للارتقاء بعملك؟</h2>
          <p className="text-xl text-gray-300 mb-10">
            انضم إلى المئات من الأساتذة الذين يعتمدون على Daftari لإدارة أعمالهم يومياً.
          </p>
          <button 
            onClick={() => navigate('/pricing')}
            className="font-bold px-10 py-5 bg-[#C5A059] text-white rounded-2xl hover:bg-[#B39050] transition-all shadow-xl shadow-[#C5A059]/20 text-xl hover:-translate-y-1"
          >
            اختر خطتك وابدأ اليوم
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100 text-center text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <Logo className="w-8 h-8 grayscale opacity-50" />
          <p>© {new Date().getFullYear()} Daftari. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-[#FAFAF8] p-8 rounded-3xl border border-gray-100 hover:border-[#C5A059]/30 hover:shadow-xl hover:shadow-[#C5A059]/5 transition-all"
    >
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-50">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}
