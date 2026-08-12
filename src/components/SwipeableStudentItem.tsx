import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Trash2, Edit2 } from "lucide-react";
import { Student } from "../types";

interface SwipeableStudentItemProps {
  key?: React.Key | string | number;
  student: Student;
  groupSessionsPerMonth: number;
  draftStatus: 'present' | 'absent' | 'excused';
  draftPaid: boolean;
  disabled?: boolean;
  fastAttendanceMode?: boolean;
  onToggleAttendance: (id: string, status: 'present' | 'absent' | 'excused') => void;
  onTogglePayment: (id: string, isPaid: boolean) => void;
  onDelete: (id: string) => Promise<void> | void;
  onEdit?: (student: Student) => void;
}

export function SwipeableStudentItem({
  student,
  groupSessionsPerMonth,
  draftStatus,
  draftPaid,
  disabled = false,
  fastAttendanceMode = false,
  onToggleAttendance,
  onTogglePayment,
  onDelete,
  onEdit,
}: SwipeableStudentItemProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Background opacities based on swipe direction (only delete now)
  const bgOpacityLeft = useTransform(x, [0, -80], [0, 1]); // Swipe left (delete)
  const bgOpacityRight = useTransform(x, [0, 80], [0, 1]); // Swipe right (edit)

  const handleDragEnd = (event: any, info: any) => {
    if (disabled) return;
    const threshold = 80;
    if (fastAttendanceMode) {
      if (info.offset.x < -threshold) {
        onToggleAttendance(student.id!, 'absent');
      } else if (info.offset.x > threshold) {
        onToggleAttendance(student.id!, 'present');
      }
    } else {
      if (info.offset.x < -threshold) {
        onDelete(student.id!);
      } else if (info.offset.x > threshold && onEdit) {
        onEdit(student);
      }
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2);
  };

  const currentBalance = student.sessionBalance ?? 0;
  const isUnpaid = currentBalance > 0;
  const counterColor = isUnpaid
    ? "bg-red-500 text-white border-red-500"
    : "bg-green-500 text-white border-green-500";

  let balanceText = "";
  let balanceColor = "text-gray-600";

  if (currentBalance < 0) {
    balanceText = `رصيد مدفوع مسبقًا: ${Math.abs(currentBalance)} حصة`;
    balanceColor = "text-green-600";
  } else if (currentBalance === 0) {
    balanceText = "الرصيد متعادل";
    balanceColor = "text-gray-500";
  } else {
    balanceText = `حصص غير مغطاة بالدفع: ${currentBalance}`;
    balanceColor = "text-[#C5A059]";
  }

  return (
    <div
      className="relative border-b border-gray-100 overflow-hidden"
      ref={containerRef}
    >
      {/* Background Action Panels */}
      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
        {/* Left side (revealed on Right swipe) -> Edit or Present */}
        {(!fastAttendanceMode && onEdit) || fastAttendanceMode ? (
          <motion.div
            className={`h-full flex items-center justify-start absolute left-0 top-0 bottom-0 w-1/2 rounded-lg px-6 ${fastAttendanceMode ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ opacity: bgOpacityRight, zIndex: 0 }}
          >
            <div className="text-white flex items-center gap-2">
              {!fastAttendanceMode && <Edit2 size={24} />}
              <span className="font-bold">{fastAttendanceMode ? 'حاضر' : 'تعديل'}</span>
            </div>
          </motion.div>
        ) : null}

        {/* Right side (revealed on Left swipe) -> Delete or Absent */}
        <motion.div
          className={`h-full flex items-center justify-end absolute right-0 top-0 bottom-0 w-1/2 rounded-lg px-6 ${fastAttendanceMode ? 'bg-red-500' : 'bg-red-500'}`}
          style={{ opacity: bgOpacityLeft, zIndex: 0 }}
        >
          <div className="text-white flex items-center gap-2">
            <span className="font-bold">{fastAttendanceMode ? 'غائب' : 'حذف'}</span>
            {!fastAttendanceMode && <Trash2 size={24} />}
          </div>
        </motion.div>
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-[#FAF9F6] px-4 py-4 flex items-center justify-between touch-pan-y"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Circular Counter */}
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg shrink-0 ${counterColor}`}
          >
            {Math.abs(currentBalance)}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h4 className="font-semibold text-[#0B2545] text-base mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
              {student.fullName}
            </h4>
            <div className={`text-sm font-medium ${balanceColor}`}>
              {balanceText}
            </div>
          </div>
        </div>

        {/* Actions inside row */}
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && !disabled && (
            <button
              onClick={() => onEdit(student)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Edit2 size={18} />
            </button>
          )}
          <button
            onClick={() => onTogglePayment(student.id!, !draftPaid)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition duration-200 ${
              draftPaid
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {draftPaid ? "تم الدفع" : "دفع"}
          </button>

          <button
            onClick={() => {
              let nextStatus: 'present' | 'absent' | 'excused' = 'present';
              if (draftStatus === 'present') nextStatus = 'absent';
              else if (draftStatus === 'absent') nextStatus = 'excused';
              
              onToggleAttendance(student.id!, nextStatus);
            }}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition duration-200 ${
              draftStatus === 'present'
                ? "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30"
                : draftStatus === 'absent'
                ? "bg-red-50 text-red-500 border-red-200"
                : "bg-blue-50 text-blue-500 border-blue-200"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {draftStatus === 'present' ? "حاضر" : draftStatus === 'absent' ? "غائب" : "مبرر"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
