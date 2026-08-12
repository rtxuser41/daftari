import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Student } from "../types";

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (
    studentId: string,
    data: {
      fullName: string;
      phoneNumber?: string;
      parentPhone?: string;
      customPrice?: number;
      joiningDate?: any;
      notes?: string;
    },
  ) => Promise<any>;
  student: Student | null;
  groupPrice?: number;
}

export function EditStudentModal({
  isOpen,
  onClose,
  onEdit,
  student,
  groupPrice,
}: EditStudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [notes, setNotes] = useState("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student) {
      setFullName(student.fullName);
      setPhoneNumber(student.phoneNumber || "");
      setParentPhone(student.parentPhone || "");
      setJoiningDate(
        student.joiningDate
          ? new Date(student.joiningDate).toISOString().split("T")[0]
          : "",
      );
      setNotes(student.notes || "");
      setCustomPrice(
        student.customPrice !== undefined ? student.customPrice.toString() : "",
      );
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("يرجى إدخال اسم الطالب");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onEdit(student.id!, {
        fullName,
        phoneNumber: phoneNumber || undefined,
        parentPhone: parentPhone || undefined,
        joiningDate: joiningDate
          ? new Date(joiningDate).toISOString()
          : undefined,
        notes: notes || undefined,
        customPrice: customPrice ? Number(customPrice) : undefined,
      });
      onClose();
    } catch (error) {
      setError("حدث خطأ أثناء تعديل الطالب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-0">
      <div
        className="bg-[#FAF9F6] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up sm:animate-fade-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#FAF9F6] z-10 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#0B2545]">
              تعديل بيانات الطالب
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم واللقب
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسم الطالب..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الطالب (اختياري)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="05X XXX XXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition"
                  disabled={isSubmitting}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الولي (اختياري)
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="05X XXX XXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition"
                  disabled={isSubmitting}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الانضمام (اختياري)
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  سعر خاص (اختياري)
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder={`الافتراضي: ${groupPrice || 0} دج`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="معلومات إضافية عن الطالب..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition resize-none h-24"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 mt-6 bg-[#0B2545] hover:bg-[#0a1f3a] text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "حفظ التعديلات"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
