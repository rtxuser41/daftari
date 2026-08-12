import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, Plus } from 'lucide-react';
import { Group } from '../types';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (groupId: string, data: Partial<Group>) => Promise<any>;
  group: Group | null;
}

const daysOfWeek = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

const groupColors = ['#C5A059', '#0B2545', '#4ade80', '#f87171', '#60a5fa', '#c084fc', '#fb923c', '#94a3b8'];

export default function EditGroupModal({ isOpen, onClose, onEdit, group }: EditGroupModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#C5A059');
  const [price, setPrice] = useState('');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('4');
  
  const [timings, setTimings] = useState<{ day: string; startTime: string; endTime: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setColor(group.color || '#C5A059');
      setPrice(group.price ? group.price.toString() : '');
      setSessionsPerMonth(group.sessionsPerMonth ? group.sessionsPerMonth.toString() : '4');
      setTimings(group.timings || []);
    }
  }, [group]);

  if (!isOpen || !group) return null;

  const handleAddTiming = () => {
    setTimings([...timings, { day: 'الأحد', startTime: '08:00', endTime: '10:00' }]);
  };

  const handleRemoveTiming = (index: number) => {
    setTimings(timings.filter((_, i) => i !== index));
  };

  const handleTimingChange = (index: number, field: string, value: string) => {
    const newTimings = [...timings];
    newTimings[index] = { ...newTimings[index], [field]: value };
    setTimings(newTimings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الفوج');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onEdit(group.id!, {
        name: name.trim(),
        color,
        price: parseFloat(price) || 0,
        sessionsPerMonth: parseInt(sessionsPerMonth, 10) || 4,
        timings
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
      <div 
        className="bg-[#FAF9F6] w-full max-w-md max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-bold text-[#0B2545]">تعديل الفوج</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم الفوج <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: 3 علمي 1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition bg-white"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">السعر الشهري (دج)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2500"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] transition bg-white"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">نظام الحصص كل شهر</label>
                  <input
                    type="number"
                    value={sessionsPerMonth}
                    onChange={(e) => setSessionsPerMonth(e.target.value)}
                    placeholder="4"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] transition bg-white"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">لون الفوج</label>
                <div className="flex gap-2 flex-wrap">
                  {groupColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Timings */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">توقيت الحصص</label>
                <button
                  type="button"
                  onClick={handleAddTiming}
                  className="flex items-center gap-1.5 text-sm font-bold text-[#C5A059] hover:text-[#b08d4d] transition-colors bg-[#C5A059]/10 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={16} />
                  <span>إضافة توقيت</span>
                </button>
              </div>

              <div className="space-y-3">
                {timings.map((timing, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group">
                    <div className="flex-1 space-y-3">
                      <select
                        value={timing.day}
                        onChange={(e) => handleTimingChange(index, 'day', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] text-sm bg-gray-50"
                      >
                        {daysOfWeek.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 overflow-hidden">
                          <Clock size={14} className="text-gray-400 shrink-0" />
                          <input
                            type="time"
                            value={timing.startTime}
                            onChange={(e) => handleTimingChange(index, 'startTime', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-2 outline-none"
                          />
                        </div>
                        <span className="text-gray-400 font-medium">-</span>
                        <div className="flex-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 overflow-hidden">
                          <input
                            type="time"
                            value={timing.endTime}
                            onChange={(e) => handleTimingChange(index, 'endTime', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-2 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTiming(index)}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                
                {timings.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">لم يتم إضافة أي توقيت بعد</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#0B2545] hover:bg-[#0a1f3a] text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'حفظ التعديلات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
