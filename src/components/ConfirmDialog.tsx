import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
  dangerous?: boolean;
}

/**
 * نافذة تأكيد موحّدة (بالعربية RTL) لكل عمليات الحذف في التطبيق.
 * تُستخدم بدل window.confirm() للحصول على واجهة واضحة ومريحة على الهاتف.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'نعم، احذف',
  cancelLabel = 'إلغاء',
  onConfirm,
  onCancel,
  isConfirming = false,
  dangerous = true,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            dir="rtl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dangerous ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <AlertTriangle className={`w-5 h-5 ${dangerous ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
                <h3 className="text-lg font-bold text-[#0B2545]">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                disabled={isConfirming}
                className="p-2 -m-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isConfirming}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-[#0B2545] hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isConfirming}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50 ${
                  dangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B2545] hover:bg-[#0a1f3a]'
                }`}
              >
                {isConfirming ? 'جاري الحذف...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
