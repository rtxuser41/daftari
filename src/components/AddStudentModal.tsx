import React, { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validateOptionalAlgerianPhone, normalizeAlgerianPhone } from "../utils/phoneValidation";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    fullName: string;
    phoneNumber?: string;
    parentPhone?: string;
    customPrice?: number;
    joiningDate?: any;
    notes?: string;
  }) => Promise<any>;
  groupPrice?: number;
}

export function AddStudentModal({
  isOpen,
  onClose,
  onAdd,
  groupPrice,
}: AddStudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("الرجاء إدخال اسم الطالب");
      return;
    }

    const phoneError = validateOptionalAlgerianPhone(phoneNumber);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    const parentPhoneError = validateOptionalAlgerianPhone(parentPhone);
    if (parentPhoneError) {
      setError(parentPhoneError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onAdd({
        fullName,
        phoneNumber: normalizeAlgerianPhone(phoneNumber) || undefined,
        parentPhone: normalizeAlgerianPhone(parentPhone) || undefined,
        joiningDate: joiningDate
          ? new Date(joiningDate).toISOString()
          : undefined,
        notes: notes || undefined,
        customPrice: customPrice ? Number(customPrice) : undefined,
      });
      setFullName("");
      setPhoneNumber("");
      setParentPhone("");
      setJoiningDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setCustomPrice("");
      onClose();
    } catch (error) {
      setError("حدث خطأ أثناء إضافة الطالب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF9F6] rounded-t-3xl shadow-2xl pb-safe h-[85vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#FAF9F6] z-10 pt-2 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#0B2545]">
                  إضافة طالب جديد
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
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
                    placeholder="محمد عبدالله"
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition text-left"
                      dir="ltr"
                      disabled={isSubmitting}
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-transparent transition text-left"
                      dir="ltr"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تاريخ الانضمام
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
                  className="w-full mt-6 bg-[#0B2545] text-white py-4 rounded-xl font-bold hover:bg-[#0B2545]/90 transition shadow-lg disabled:opacity-70"
                >
                  {isSubmitting ? "جاري الإضافة..." : "إضافة الطالب"}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
