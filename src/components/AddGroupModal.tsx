import React, { useState } from 'react';
import { X, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimingInput {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (groupData: { name: string; sessionsPerMonth: number; price: number; timings: { day: string; startTime: string; endTime: string }[]; color?: string; }) => Promise<any>;
}

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const groupColors = ['#C5A059', '#0B2545', '#4ade80', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#94a3b8'];

export default function AddGroupModal({ isOpen, onClose, onAdd }: AddGroupModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('4');
  const [color, setColor] = useState('#C5A059');
  const [timings, setTimings] = useState<TimingInput[]>([{ id: Date.now().toString() + Math.random().toString(), day: daysOfWeek[0], startTime: '08:00', endTime: '10:00' }]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const addTimingRow = () => {
    setTimings([...timings, { id: Date.now().toString() + Math.random().toString(), day: daysOfWeek[0], startTime: '08:00', endTime: '10:00' }]);
  };

  const removeTimingRow = (id: string) => {
    setTimings(timings.filter(t => t.id !== id));
  };

  const updateTiming = (id: string, field: keyof TimingInput, value: string) => {
    setTimings(timings.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('يرجى إدخال اسم المجموعة');
      return;
    }
    
    const parsedPrice = parseFloat(price);
    const parsedSessions = parseInt(sessionsPerMonth, 10);
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('يرجى إدخال سعر صالح');
      return;
    }
    
    if (isNaN(parsedSessions) || parsedSessions <= 0) {
      setError('يرجى إدخال عدد حصص صالح');
      return;
    }

    if (timings.length === 0) {
      setError('يجب إضافة توقيت واحد على الأقل');
      return;
    }

    for (const t of timings) {
      if (!t.day || !t.startTime || !t.endTime) {
        setError('يرجى ملء جميع حقول التوقيت');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onAdd({
        name: trimmedName,
        price: parsedPrice,
        sessionsPerMonth: parsedSessions,
        timings: timings.map(({ day, startTime, endTime }) => ({ day, startTime, endTime })),
        color
      });
      // Reset form
      setName('');
      setPrice('');
      setSessionsPerMonth('4');
      setColor('#C5A059');
      setTimings([{ id: Date.now().toString() + Math.random().toString(), day: daysOfWeek[0], startTime: '08:00', endTime: '10:00' }]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة المجموعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF9F6] rounded-t-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 overflow-y-auto hide-scrollbar flex-1 pb-safe">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#0B2545]">مجموعة جديدة</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Group Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفوج</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: 3 علمي 1"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السعر الشهري (DZD)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="2000"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                  
                  {/* Sessions per Month */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نظام الحصص كل شهر</label>
                    <input
                      type="number"
                      value={sessionsPerMonth}
                      onChange={(e) => setSessionsPerMonth(e.target.value)}
                      min="1"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">لون الفوج</label>
                  <div className="flex gap-2 flex-wrap">
                    {groupColors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[#0B2545] font-semibold mb-3 flex items-center justify-between">
                    أوقات الفوج
                  </h4>
                  
                  <div className="space-y-4">
                    {timings.map((timing, index) => (
                      <div key={`timing-${timing.id}`} className="relative bg-cream p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                        {timings.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimingRow(timing.id)}
                            className="absolute top-3 left-3 text-red-500 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">اليوم</label>
                          <div className="relative">
                            <select
                              value={timing.day}
                              onChange={(e) => updateTiming(timing.id, 'day', e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-cream focus:bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all appearance-none pr-10"
                            >
                              {daysOfWeek.map(day => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                            <Calendar className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">من</label>
                            <input
                              type="time"
                              value={timing.startTime}
                              onChange={(e) => updateTiming(timing.id, 'startTime', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-cream focus:bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">إلى</label>
                            <input
                              type="time"
                              value={timing.endTime}
                              onChange={(e) => updateTiming(timing.id, 'endTime', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-cream focus:bg-cream focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTimingRow}
                    className="mt-4 flex items-center gap-2 text-[#C5A059] font-medium hover:text-[#b4904d] transition text-sm py-2 px-1"
                  >
                    <Plus className="w-4 h-4" />
                    + إضافة توقيت آخر
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#0B2545] text-white py-4 rounded-xl font-bold hover:bg-[#0B2545]/90 transition shadow-lg disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'أضف المجموعة'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
