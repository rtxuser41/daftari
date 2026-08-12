import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, MapPin, Users, Edit2, Trash2, AlertCircle, Wallet } from 'lucide-react';
import { useClassrooms } from '../hooks/useClassrooms';
import { Classroom } from '../domain/models';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function Classrooms() {
  const navigate = useNavigate();
  const { classrooms, loading, error, addClassroom, updateClassroom, deleteClassroom } = useClassrooms();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    capacity: '',
    monthlyRent: '',
    color: '#0B2545',
    notes: '',
    isActive: true
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isReadOnly = false;

  const handleOpenModal = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setFormData({
        name: classroom.name,
        address: classroom.address || '',
        capacity: classroom.capacity.toString(),
        monthlyRent: classroom.monthlyRent.toString(),
        color: classroom.color || '#0B2545',
        notes: classroom.notes || '',
        isActive: classroom.isActive
      });
    } else {
      setEditingClassroom(null);
      setFormData({
        name: '',
        address: '',
        capacity: '',
        monthlyRent: '',
        color: '#0B2545',
        notes: '',
        isActive: true
      });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClassroom(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'اسم القاعة مطلوب';
    if (!formData.capacity || parseInt(formData.capacity) <= 0) return 'سعة القاعة يجب أن تكون أكبر من 0';
    if (formData.monthlyRent && parseFloat(formData.monthlyRent) < 0) return 'قيمة الإيجار لا يمكن أن تكون سالبة';
    
    const isDuplicate = classrooms.some(c => 
      c.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && 
      c.id !== editingClassroom?.id
    );
    if (isDuplicate) return 'يوجد قاعة بنفس الاسم في هذه السنة الدراسية';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingClassroom) {
        await updateClassroom(editingClassroom.id, {
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          capacity: parseInt(formData.capacity),
          monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : 0,
          notes: formData.notes.trim() || undefined,
          color: formData.color,
          isActive: formData.isActive
        });
      } else {
        await addClassroom({
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          capacity: parseInt(formData.capacity),
          monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : 0,
          notes: formData.notes.trim() || undefined,
          color: formData.color,
          isActive: formData.isActive
        });
      }
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
  };

  const handleDeleteConfirmed = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteClassroom(id);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -mr-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-[#0B2545]">القاعات الدراسية</h1>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="p-2 bg-[#C5A059]/10 rounded-full text-[#C5A059] hover:bg-[#C5A059]/20 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-24">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>تعذر تحميل القاعات</p>
          </div>
        )}

        {isReadOnly && classrooms.length > 0 && (
          <div className="mb-6 p-4 bg-gray-100 rounded-xl text-center border border-gray-200">
            <p className="text-sm font-medium text-gray-600">السنة الدراسية الحالية مؤرشفة (للقراءة فقط)</p>
          </div>
        )}

        {classrooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد قاعات</h3>
            <p className="text-gray-500 text-sm mb-6">قم بإضافة القاعات الدراسية لتنظيم أفواجك</p>
            {!isReadOnly && (
              <button
                onClick={() => handleOpenModal()}
                className="px-6 py-2.5 bg-[#0B2545] text-white rounded-xl font-bold hover:bg-[#0a1f3a] transition-colors"
              >
                إضافة قاعة جديدة
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {classrooms.map(classroom => (
              <div 
                key={classroom.id} 
                className={`bg-white p-5 rounded-2xl border ${classroom.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'} shadow-sm`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm border border-black/10" 
                      style={{ backgroundColor: classroom.color || '#0B2545' }} 
                    />
                    <div>
                      <h3 className="font-bold text-[#0B2545] text-lg">{classroom.name}</h3>
                      {classroom.address && (
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {classroom.address}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenModal(classroom)}
                        className="p-2 text-gray-400 hover:text-[#0B2545] hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(classroom.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> السعة القصوى
                    </p>
                    <p className="font-bold text-gray-700">{classroom.capacity} طالب</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" /> الإيجار الشهري
                    </p>
                    <p className="font-bold text-[#C5A059]">{classroom.monthlyRent} د.ج</p>
                  </div>
                </div>

                {classroom.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-sm text-gray-600">{classroom.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0B2545] mb-6">
                {editingClassroom ? 'تعديل بيانات القاعة' : 'إضافة قاعة جديدة'}
              </h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم القاعة *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                    placeholder="مثال: القاعة الكبرى، قاعة 1"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">العنوان / الموقع</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                    placeholder="عنوان القاعة"
                    dir="rtl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">السعة (طالب) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">الإيجار الشهري</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.monthlyRent}
                      onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">لون مميز</label>
                  <div className="flex gap-3">
                    {['#0B2545', '#C5A059', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#64748b'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-[#C5A059] rounded border-gray-300 focus:ring-[#C5A059]"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-gray-700 select-none">
                    القاعة نشطة ومتاحة للاستخدام
                  </label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#0B2545] text-white font-bold py-3 rounded-xl hover:bg-[#0a1f3a] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        title="حذف القاعة؟"
        message="سيتم حذف هذه القاعة نهائياً من جميع المجموعات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="نعم، احذف القاعة"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
