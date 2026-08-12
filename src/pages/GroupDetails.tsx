import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dbService } from "../services/dbService";
import { useStudents } from "../hooks/useStudents";
import { useFinance } from "../hooks/useFinance";
import { Group, Student } from "../types";
import {
  ArrowRight,
  UserPlus,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Search,
  Filter,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { SwipeableStudentItem } from "../components/SwipeableStudentItem";
import { DebtService } from "../domain/services/DebtService";
import { AddStudentModal } from "../components/AddStudentModal";
import { EditStudentModal } from "../components/EditStudentModal";
import EditGroupModal from "../components/EditGroupModal";
import { useAuth } from "../contexts/AuthContext";
import { useGroups } from "../hooks/useGroups";
import { useClassrooms } from "../hooks/useClassrooms";
import { useSession } from "../hooks/useSession";

type Tab = "students" | "debtors" | "finance" | "deleted";

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const { editGroup } = useGroups();
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [limitError, setLimitError] = useState("");

  // Drafts
  const [draftAttendance, setDraftAttendance] = useState<
    Record<string, 'present' | 'absent' | 'excused'>
  >({});
  const [draftPayment, setDraftPayment] = useState<Record<string, boolean>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState("");
  const [fastAttendanceMode, setFastAttendanceMode] = useState(false);

  // Expenses Form
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expError, setExpError] = useState("");

  const { user } = useAuth();

  const { classrooms } = useClassrooms();
  const { session, loading: sessionLoading, cancelSession, reload: reloadSession } = useSession(id!);

  const {
    students,
    loading: studentsLoading,
    error: studentsError,
    retry: retryStudents,
    addStudent,
    editStudent,
    softDeleteStudent,
    restoreStudent,
    confirmSession,
  } = useStudents(id!);

  const {
    payments,
    expenses,
    loading: financeLoading,
    addExpense,
    deleteExpense,
  } = useFinance(id!);

  const loading = studentsLoading || financeLoading || sessionLoading;
  const error = studentsError;

  const [sessionNotes, setSessionNotes] = useState("");
  useEffect(() => {
    if (session?.notes) {
      setSessionNotes(session.notes);
    } else {
      setSessionNotes("");
    }
  }, [session]);

  const handleAddStudentClick = () => {
    if (false) {
      setLimitError("لا يمكن الإضافة في سنة جامعية مؤرشفة");
      setTimeout(() => setLimitError(""), 3000);
      return;
    }
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id || !user) return;
      try {
        const data = await dbService.groups.get(id);
        if (data && data.userId === user.uid) {
          setGroup(data);
        }
      } catch (err) {
        console.error("Error fetching group details:", err);
      }
    };
    fetchGroup();
  }, [id, user]);

  const tabs = [
    { id: "students", label: "الطلاب" },
    { id: "debtors", label: "المديونون" },
    { id: "finance", label: "التقرير المالي" },
    { id: "deleted", label: "المحذوفون" },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<
    "name" | "date_desc" | "date_asc"
  >("date_desc");

  // Filtering Logic
  const activeStudents = students.filter((s) => !s.isDeleted);
  const deletedStudents = students.filter((s) => s.isDeleted);
  const filteredActiveStudents = activeStudents.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const sortedStudents = [...filteredActiveStudents].sort((a, b) => {
    if (sortOption === "name")
      return a.fullName.localeCompare(b.fullName, "ar");
    if (sortOption === "date_asc")
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const paymentCycleSessions = group?.sessionsPerMonth || 4;
  const paymentAmount = group?.price || 0;

  // Debtors are active students who have outstandingAmount > 0 and NOT marked paid in the draft
  const debtors = activeStudents
    .map((s) => {
      const outstandingAmount = DebtService.calculateDebtAmount(s);
      const unpaidCycles = DebtService.calculateDebtSessions(s, paymentAmount, paymentCycleSessions);
      return {
        ...s,
        sessionBalance: s.sessionBalance ?? 0,
        unpaidCycles,
        outstandingAmount,
      };
    })
    .filter((s) => {
      const isPaid = draftPayment[s.id!] === true;
      return s.outstandingAmount > 0 && !isPaid;
    });

  const handleToggleAttendance = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    if (false) return;
    setDraftAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllAttendance = (status: 'present' | 'absent' | 'excused') => {
    if (false) return;
    const newDraft: Record<string, 'present' | 'absent' | 'excused'> = {};
    activeStudents.forEach(s => {
      newDraft[s.id!] = status;
    });
    setDraftAttendance(newDraft);
  };

  const handleTogglePayment = (studentId: string, isPaid: boolean) => {
    if (false) return;
    setDraftPayment((prev) => ({ ...prev, [studentId]: isPaid }));
  };

  const handleConfirmSession = async () => {
    if (!group) return;
    if (false) return;
    if (!session || session.confirmedAt) return;
    setIsConfirming(true);
    try {
      if (sessionNotes !== session.notes) {
        await dbService.sessions.updateSession(session.id!, { notes: sessionNotes });
      }
      
      await confirmSession(
        session.id!,
        group.price || 0,
        group.sessionsPerMonth || 4,
        draftAttendance,
        draftPayment,
      );
      
      setDraftAttendance({});
      setDraftPayment({});
      setConfirmSuccess("تم تأكيد الحصة بنجاح.");
      setTimeout(() => setConfirmSuccess(""), 3000);
      reloadSession();
    } catch (err) {
      console.error(err);
      setLimitError("حدث خطأ أثناء تأكيد الحصة. يرجى المحاولة مرة أخرى.");
      setTimeout(() => setLimitError(""), 3000);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelSession = async () => {
    if (window.confirm("هل أنت متأكد من إلغاء الحصة؟")) {
      try {
        await cancelSession();
        setDraftAttendance({});
        setDraftPayment({});
        setConfirmSuccess("تم إلغاء الحصة بنجاح.");
        setTimeout(() => setConfirmSuccess(""), 3000);
      } catch (err) {
        setLimitError("حدث خطأ أثناء إلغاء الحصة.");
        setTimeout(() => setLimitError(""), 3000);
      }
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !expDescription.trim() ||
      !expAmount ||
      isNaN(Number(expAmount)) ||
      Number(expAmount) <= 0
    ) {
      setExpError("يرجى التأكد من الوصف والمبلغ (يجب أن يكون رقماً موجباً).");
      return;
    }
    try {
      setExpError("");
      await addExpense({
        description: expDescription.trim(),
        amount: Number(expAmount),
        date: new Date(expDate),
      });
      setExpDescription("");
      setExpAmount("");
      setExpDate(new Date().toISOString().split("T")[0]);
      setConfirmSuccess("تم إضافة المصروف بنجاح.");
      setTimeout(() => setConfirmSuccess(""), 3000);
    } catch (err) {
      setExpError("حدث خطأ أثناء إضافة المصروف.");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="m-4 p-6 bg-red-50 rounded-2xl text-center border border-red-100 flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-medium text-red-800">
            تعذر تحميل البيانات. تحقق من تسجيل الدخول وإعدادات قاعدة البيانات ثم
            أعد المحاولة.
          </p>
          <button
            onClick={retryStudents}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    if (activeTab === "students") {
      return (
        <div className="pb-32 relative">
          {true && (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  onClick={handleAddStudentClick}
                  className="flex-1 bg-[#0B2545] text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-[#0a1f3a] transition-colors"
                >
                  <UserPlus size={20} className="text-[#C5A059]" />
                  <span>إضافة طالب</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmSuccess(
                      "قريباً: ميزة الاستيراد من ملف Excel ستكون متاحة قريباً",
                    );
                    setTimeout(() => setConfirmSuccess(""), 3000);
                  }}
                  className="bg-white border border-gray-200 text-[#0B2545] font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <Upload size={20} />
                  <span className="hidden sm:inline">استيراد</span>
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="ابحث عن طالب..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] bg-white text-sm"
                  />
                </div>
                <div className="relative w-[130px]">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="w-full pl-2 pr-9 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] bg-white text-sm appearance-none"
                    dir="rtl"
                  >
                    <option value="date_desc">الأحدث أولاً</option>
                    <option value="date_asc">الأقدم أولاً</option>
                    <option value="name">الاسم (أ-ي)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {sortedStudents.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              لا يوجد طلاب متطابقين مع البحث
            </div>
          ) : (
            <>
              {true && session && !session.confirmedAt && (
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B2545] text-sm">وضع الغياب السريع (السحب)</span>
                    <button
                      onClick={() => setFastAttendanceMode(!fastAttendanceMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fastAttendanceMode ? 'bg-[#C5A059]' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${fastAttendanceMode ? '-translate-x-6' : '-translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => markAllAttendance('present')} className="flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">الكل حاضر</button>
                    <button onClick={() => markAllAttendance('absent')} className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200">الكل غائب</button>
                  </div>
                </div>
              )}
              {sortedStudents.map((student) => {
                const status = draftAttendance[student.id!] ?? 'present'; // Default present
                const isPaid = draftPayment[student.id!] === true; // Default false
                return (
                  <SwipeableStudentItem
                    key={`students-${student.id}`}
                    student={student}
                    groupSessionsPerMonth={group?.sessionsPerMonth || 4}
                    draftStatus={status}
                    draftPaid={isPaid}
                    disabled={false || (session && session.confirmedAt)}
                    fastAttendanceMode={fastAttendanceMode}
                    onToggleAttendance={handleToggleAttendance}
                    onTogglePayment={handleTogglePayment}
                    onDelete={softDeleteStudent}
                    onEdit={setEditingStudent}
                  />
                );
              })}

              {true && session && !session.confirmedAt && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-10 shadow-[0_-10px_40px_rgb(0,0,0,0.05)]">
                  <div className="max-w-2xl mx-auto w-full px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2">
                    <textarea 
                      placeholder="ملاحظات الحصة (اختياري)..."
                      value={sessionNotes}
                      onChange={e => setSessionNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#C5A059] focus:outline-none mb-1 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmSession}
                        disabled={isConfirming || activeStudents.length === 0}
                        className="flex-1 py-3 rounded-xl text-white font-bold bg-[#C5A059] hover:bg-[#B39050] active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm disabled:active:scale-100 text-lg"
                      >
                        {isConfirming ? "جاري التأكيد..." : "تأكيد الحصة"}
                      </button>
                      <button
                        onClick={handleCancelSession}
                        disabled={isConfirming}
                        className="py-3 px-4 rounded-xl text-red-500 font-bold bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {true && session && session.confirmedAt && (
                <div className="flex flex-col items-center justify-center p-4 m-4 bg-green-50 border border-green-100 text-green-700 rounded-xl">
                  <div className="font-bold mb-3 text-lg">✓ تم تأكيد حصة اليوم</div>
                  <button 
                    onClick={async () => {
                      try {
                        const attendance = await dbService.attendance.getAttendanceBySession(session.id!);
                        const getStatusText = (status: string) => {
                          if (status === 'present') return 'حاضر';
                          if (status === 'absent') return 'غائب';
                          if (status === 'excused') return 'مبرر';
                          return 'غير محدد';
                        };
                        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                          + "الاسم,رقم الهاتف,الحالة\n"
                          + activeStudents.map(s => `${s.fullName},${s.phoneNumber || 'لا يوجد'},${getStatusText(attendance[s.id!] ?? 'present')}`).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `تقرير_حصة_${new Date(session.date).toLocaleDateString('en-GB')}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (err) {
                        console.error('Failed to generate report', err);
                        alert('حدث خطأ أثناء استخراج التقرير');
                      }
                    }}
                    className="px-6 py-2 bg-white border border-green-200 text-green-700 font-bold rounded-lg hover:bg-green-100 transition-colors shadow-sm"
                  >
                    استخراج تقرير الحصة
                  </button>
                </div>
              )}
              {true && !session && (
                 <div className="text-center p-4 m-4">
                   <button onClick={reloadSession} className="px-4 py-2 bg-[#0B2545] text-white rounded-lg font-bold">إنشاء حصة جديدة</button>
                 </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (activeTab === "debtors") {
      if (debtors.length === 0) {
        return (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-50" />
            <p>لا يوجد تلاميذ مدينون حاليًا.</p>
          </div>
        );
      }
      return (
        <div className="pb-24 p-4 space-y-3">
          {debtors.map((student) => (
            <div
              key={`debtors-${student.id}`}
              className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-[#0B2545] text-lg">
                  {student.fullName}
                </h4>
                <div className="text-sm text-gray-500 mt-1">
                  الحصص غير المغطاة:{" "}
                  <span dir="ltr">{student.sessionBalance}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  الدورات المستحقة:{" "}
                  <span dir="ltr">{student.unpaidCycles}</span>
                </div>
              </div>
              <div className="text-left" dir="ltr">
                <span
                  className="text-sm text-gray-500 block mb-1 rtl:text-right"
                  dir="rtl"
                >
                  المبلغ الواجب دفعه:
                </span>
                <span className="font-bold text-red-500 text-lg">
                  {student.outstandingAmount} دج
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "finance") {
      const groupPrice = group?.price || 0;

      const totalRevenue = payments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0,
      );
      const totalExpenses = expenses.reduce(
        (sum, ex) => sum + (ex.amount || 0),
        0,
      );
      const netProfit = totalRevenue - totalExpenses;
      const paidStudentsCount = new Set(payments.map((p) => p.studentId)).size;
      const remainingDebt = debtors.reduce(
        (sum, d) => sum + d.outstandingAmount,
        0,
      );

      return (
        <div className="p-4 space-y-4 pb-24">
          <div className="bg-cream p-5 rounded-2xl shadow-sm border border-[#0B2545]/5 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                إجمالي الإيرادات المؤكدة
              </p>
              <h3 className="text-2xl font-bold text-green-600">
                {totalRevenue}{" "}
                <span className="text-sm font-normal text-gray-500">DZD</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {paidStudentsCount} طلاب مسددين
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
              <FileText size={24} />
            </div>
          </div>

          <div className="bg-cream p-5 rounded-2xl shadow-sm border border-[#0B2545]/5 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">
                إجمالي المصاريف
              </p>
              <h3 className="text-2xl font-bold text-[#0B2545]">
                {totalExpenses}{" "}
                <span className="text-sm font-normal text-gray-500">DZD</span>
              </h3>
            </div>
          </div>

          <div className="bg-[#0B2545] p-5 rounded-2xl shadow-sm flex items-center justify-between text-white">
            <div>
              <p className="text-gray-300 text-sm font-medium mb-1">
                الربح الصافي
              </p>
              <h3 className="text-2xl font-bold">
                {netProfit}{" "}
                <span className="text-sm font-normal text-gray-400">DZD</span>
              </h3>
            </div>
          </div>

          <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
            <div>
              <p className="text-red-800 text-sm font-medium mb-1">
                الديون المعلقة
              </p>
              <h3 className="text-2xl font-bold text-red-600">
                {remainingDebt}{" "}
                <span className="text-sm font-normal text-red-400">DZD</span>
              </h3>
              <p className="text-xs text-red-400 mt-1">
                {debtors.length} مدينون ({debtors.length} طلاب)
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm border border-red-100">
              <Clock size={24} />
            </div>
          </div>

          {true && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-bold text-[#0B2545] mb-4">
                إضافة مصاريف
              </h3>

              <form
                onSubmit={handleAddExpense}
                className="space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف المصروف
                  </label>
                  <input
                    type="text"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="مثال: طباعة أوراق"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المبلغ (DZD)
                    </label>
                    <input
                      type="number"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C5A059] focus:outline-none"
                    />
                  </div>
                </div>
                {expError && (
                  <p className="text-red-500 text-sm mt-2">{expError}</p>
                )}
                <button
                  type="submit"
                  className="w-full bg-[#0B2545] text-white font-bold py-2.5 rounded-lg mt-2 hover:bg-[#0a1f3a] transition-colors"
                >
                  تأكيد المصروف
                </button>
              </form>
            </div>
          )}

          {expenses.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-[#0B2545] mb-4">
                المصاريف السابقة
              </h3>
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const dateString = expense.date?.toDate
                    ? expense.date.toDate().toLocaleDateString()
                    : new Date(expense.date).toLocaleDateString("en-GB");
                  return (
                    <div
                      key={expense.id}
                      className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {expense.description}
                        </p>
                        <p className="text-sm text-gray-500" dir="ltr">
                          {dateString}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[#0B2545]">
                          {expense.amount} دج
                        </span>
                        {true && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "هل أنت متأكد من حذف هذا المصروف؟",
                                )
                              ) {
                                deleteExpense(expense.id!);
                              }
                            }}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "deleted") {
      if (deletedStudents.length === 0) {
        return (
          <div className="text-center py-20 text-gray-500">
            لا يوجد طلاب محذوفون.
          </div>
        );
      }
      return (
        <div className="pb-24 space-y-2 p-4">
          {deletedStudents.map((student) => (
            <div
              key={`deleted-${student.id}`}
              className="bg-cream p-4 rounded-xl shadow-sm flex items-center justify-between opacity-75"
            >
              <div>
                <h4 className="font-semibold text-[#0B2545]">
                  {student.fullName}
                </h4>
                <p className="text-sm text-gray-500">{student.phoneNumber}</p>
                <p className="text-xs text-gray-400 mt-1">
                  الحصص السابقة: {student.attendedSessionsSinceLastPayment || 0}
                </p>
              </div>
              {true && (
                <button
                  onClick={async () => {
                    await restoreStudent(student.id!);
                    setConfirmSuccess("تم استرجاع الطالب بنجاح.");
                    setTimeout(() => setConfirmSuccess(""), 3000);
                  }}
                  className="px-4 py-2 bg-gray-100 text-[#0B2545] rounded-lg text-sm font-bold hover:bg-gray-200 transition"
                >
                  استرجاع
                </button>
              )}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowRight size={24} className="text-[#0B2545]" />
              </button>
              {group && group.color && (
                <div
                  className="w-3 h-8 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
              )}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-[#0B2545]">
                  {group ? group.name : "جاري التحميل..."}
                </h1>
              </div>
            </div>
            {group && true && (
              <button
                onClick={() => setIsEditGroupModalOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
              >
                <Edit2 size={20} />
              </button>
            )}
          </div>

          <div className="flex px-4 overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-[#0B2545]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabGroupDetails"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#C5A059] rounded-t-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto sm:mt-4 sm:rounded-xl overflow-hidden bg-[#FAF9F6] sm:border sm:border-transparent sm:shadow-none shadow-sm pb-10">
        {renderContent()}
      </main>

      {limitError && (
        <div className="fixed bottom-[calc(130px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-red-100 border border-red-200 text-red-600 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center justify-between gap-3">
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

      {confirmSuccess && (
        <div className="fixed bottom-[calc(130px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">{confirmSuccess}</p>
        </div>
      )}

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addStudent}
        groupPrice={group?.price}
      />

      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onEdit={editStudent}
        student={editingStudent}
        groupPrice={group?.price}
      />

      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        onEdit={editGroup}
        group={group}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
