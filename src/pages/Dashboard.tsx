import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, ChevronLeft, Calendar, Settings, Wallet, AlertCircle, BookOpen, MapPin, TrendingUp } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useAllStudents } from '../hooks/useAllStudents';
import { useClassrooms } from '../hooks/useClassrooms';
import AddGroupModal from '../components/AddGroupModal';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useProGuard } from '../hooks/useProGuard';

const daysOfWeek = ['كل الأيام', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function Dashboard() {
  const { groups, loading: groupsLoading, error, addGroup, searchQuery, setSearchQuery, retry } = useGroups();
  const { students, loading: studentsLoading } = useAllStudents();
  const { classrooms, loading: classroomsLoading } = useClassrooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeChip, setActiveChip] = useState('كل الأيام');
  const [limitError, setLimitError] = useState('');
  const navigate = useNavigate();
  const { isPro, user } = useAuth();
  const { canAddGroup, MAX_FREE_GROUPS } = useProGuard();

  const loading = groupsLoading || studentsLoading || classroomsLoading;

  // إحصائيات سريعة من قاعدة البيانات (المصدر الوحيد للحقيقة هو Supabase)
  const [stats, setStats] = useState({ unpaidStudents: 0, sessionsThisWeek: 0 });
  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      const { supabase } = await import('../lib/supabase');
      try {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const [debtRows, sessionRows] = await Promise.all([
          supabase
            .from('student_debt_summary')
            .select('student_id')
            .gt('session_balance', 0),
          supabase
            .from('sessions')
            .select('id')
            .gte('date', weekStart.toISOString()),
        ]);
        if (cancelled) return;
        setStats({
          unpaidStudents: Math.min((debtRows.data || []).length, 10000),
          sessionsThisWeek: (sessionRows.data || []).length,
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };
    if (user) loadStats();
    return () => { cancelled = true; };
  }, [user, studentsLoading]);

  const handleAddGroupClick = () => {
    if (canAddGroup(groups.length, isPro)) {
      setLimitError('');
      setIsModalOpen(true);
    } else {
      setLimitError(`النسخة المجانية تسمح بـ ${MAX_FREE_GROUPS} أفواج كحد أقصى. يرجى الترقية.`);
      setTimeout(() => setLimitError(''), 5000);
    }
  };

  const filteredGroups = groups.filter(group => {
    if (activeChip !== 'كل الأيام' && !group.timings?.some(t => t.day === activeChip)) return false;
    return true;
  });

  const lowercaseQuery = searchQuery.toLowerCase();
  
  const searchedStudents = searchQuery 
    ? students.filter(student => !student.isDeleted && student.fullName.toLowerCase().includes(lowercaseQuery))
    : [];

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Sticky SliverAppBar Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 backdrop-blur-md pt-6 pb-3 border-b border-gray-200">
        <div className="px-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#0B2545]">أفواج اليوم</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/classrooms')} className="p-2 bg-black/5 rounded-full text-gray-600 hover:text-[#C5A059] transition-colors" title="القاعات">
                <BookOpen className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/finance')} className="p-2 bg-black/5 rounded-full text-gray-600 hover:text-[#C5A059] transition-colors" title="المالية">
                <Wallet className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/settings')} className="p-2 bg-black/5 rounded-full text-gray-600 hover:text-[#0B2545] transition-colors" title="الإعدادات">
                <Settings className="w-5 h-5" />
              </button>
              <Logo className="w-10 h-10" />
            </div>
          </div>
          
          {/* Search Pill */}
          <div className="relative mb-3">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن طالب أو فوج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/5 text-gray-800 rounded-full py-2.5 pr-12 pl-4 focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all"
            />
          </div>

          {/* Quick Filter Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                onClick={() => setActiveChip(day)}
                className={`flex-shrink-0 snap-start px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeChip === day
                    ? 'bg-[#0B2545] text-white shadow-md'
                    : 'bg-cream text-gray-600 border border-gray-200 hover:bg-cream'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="pb-24 max-w-2xl mx-auto shadow-sm sm:mt-4 sm:rounded-xl overflow-hidden bg-white sm:border sm:border-gray-100">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <div className="p-4 bg-[#FAF9F6] border-b border-gray-200/60">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#C5A059]" />
              <h2 className="text-sm font-bold text-[#0B2545]">نظرة سريعة</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/finance')}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-right shadow-sm hover:border-[#C5A059]/30 transition-colors"
              >
                <p className="text-xs text-gray-500 font-medium mb-1">تلاميذ عليهم مستحقات</p>
                <p className="text-2xl font-bold text-red-600" dir="ltr">{stats.unpaidStudents}</p>
              </button>
              <button
                onClick={() => navigate('/finance')}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-right shadow-sm hover:border-[#C5A059]/30 transition-colors"
              >
                <p className="text-xs text-gray-500 font-medium mb-1">حصص هذا الأسبوع</p>
                <p className="text-2xl font-bold text-[#0B2545]" dir="ltr">{stats.sessionsThisWeek}</p>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="m-4 p-6 bg-red-50 rounded-2xl text-center border border-red-100 flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-medium text-red-800">
              تعذر تحميل البيانات. تحقق من تسجيل الدخول وإعدادات قاعدة البيانات ثم أعد المحاولة.
            </p>
            <button 
              onClick={retry}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && filteredGroups.length === 0 && !searchQuery && (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد أفواج</h3>
            <p className="text-gray-500 text-sm">لم يتم العثور على أي أفواج متاحة. أضف فوجاً جديداً للبدء.</p>
          </div>
        )}

        {!loading && !error && searchQuery && filteredGroups.length === 0 && searchedStudents.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">لا توجد نتائج</h3>
            <p className="text-gray-500 text-sm">لم يتم العثور على أي طالب أو فوج يطابق بحثك.</p>
          </div>
        )}

        {/* Edge-to-edge List */}
        <div className="divide-y divide-gray-200/60 bg-cream">
          {!searchQuery && (
            <div className="p-4 bg-[#FAF9F6] border-b border-gray-200/60">
              <button
                onClick={handleAddGroupClick}
                className="w-full bg-[#0B2545] text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-[#0a1f3a] transition-colors"
              >
                <Plus size={20} className="text-[#C5A059]" />
                <span>إضافة فوج جديد</span>
              </button>
            </div>
          )}
          
          {searchQuery && searchedStudents.length > 0 && (
            <div className="bg-[#FAF9F6] px-4 py-2 border-b border-gray-200/60 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C5A059]" />
              <h2 className="text-sm font-bold text-gray-500">الطلاب المطابقون</h2>
            </div>
          )}
          
          {searchQuery && searchedStudents.map(student => (
            <div 
              key={`student-${student.id}`} 
              onClick={() => navigate(`/group/${student.groupId}`)}
              className="flex items-center p-4 active:bg-cream transition-colors cursor-pointer bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-[#0B2545]/10 flex items-center justify-center text-[#0B2545] font-bold text-lg shadow-sm shrink-0">
                {getInitials(student.fullName)}
              </div>
              <div className="mr-3 flex-1 flex flex-col justify-center overflow-hidden">
                <h3 className="text-[16px] font-bold text-[#0B2545] truncate">{student.fullName}</h3>
                <p className="text-[13px] text-gray-500 mt-1 truncate">
                  {groups.find(g => g.id === student.groupId)?.name || 'فوج غير معروف'}
                </p>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            </div>
          ))}

          {searchQuery && filteredGroups.length > 0 && (
            <div className="bg-[#FAF9F6] px-4 py-2 border-b border-gray-200/60 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C5A059]" />
              <h2 className="text-sm font-bold text-gray-500">الأفواج المطابقة</h2>
            </div>
          )}

          {filteredGroups.map((group) => (
            <div 
              key={`group-${group.id}`} 
              onClick={() => navigate(`/group/${group.id}`)}
              className="flex items-center p-4 active:bg-cream transition-colors cursor-pointer bg-white"
            >
              {/* Circular Avatar */}
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
                style={{ backgroundColor: group.color || '#0B2545' }}
              >
                {getInitials(group.name)}
              </div>
              
              <div className="mr-3 flex-1 flex flex-col justify-center overflow-hidden">
                <h3 className="text-[16px] font-bold text-[#0B2545] truncate">{group.name}</h3>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[13px] text-gray-500 truncate flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 inline text-[#C5A059]" />
                    {group.timings?.length > 0 
                      ? group.timings.map(t => `${t.day} (${t.startTime})`).join(' ، ')
                      : 'بدون توقيت'
                    }
                  </p>
                </div>
              </div>

              <div className="ml-2 flex items-center gap-3">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[11px] text-gray-400 font-medium">الطلاب</span>
                  <span className="text-[15px] font-bold text-[#C5A059]">
                    {students.filter(s => s.groupId === group.id && !s.isDeleted).length}
                  </span>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {limitError && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-red-100 border border-red-200 text-red-600 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{limitError}</p>
          </div>
          <button 
            onClick={() => navigate('/pricing')}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            ترقية
          </button>
        </div>
      )}

      <AddGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={addGroup}
      />
    </div>
  );
}
