import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { ChevronRight, DollarSign, TrendingDown, TrendingUp, Wallet, Activity, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Group, Student } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { DebtService } from '../domain/services/DebtService';

export default function GlobalFinance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = () => setRetryCount(prev => prev + 1);

  // Fetch groups and students (offline-first capability native to Firestore)
  useEffect(() => {
    if (!user ) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    
    const unsubscribeGroups = dbService.groups.subscribe(
      user.uid,
      
      (g) => {
        setGroups(g);
      },
      (err) => {
        console.error("Full error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Students are fetched for all groups, but we need to ensure we only process those in the selected groups
    const unsubscribeStudents = dbService.students.subscribeAll(
      user.uid,
      
      (s) => {
        setStudents(s.filter(st => !st.isDeleted));
      },
      (err) => {
        console.error("Full error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribePayments = dbService.finance.subscribeGlobalPayments(user.uid, (data) => {
      setPayments(data);
    });

    const unsubscribeExpenses = dbService.finance.subscribeGlobalExpenses(user.uid, (data) => {
      setExpensesList(data);
    });

    // Simulate small loading for UI smoothing
    setTimeout(() => {
      if (!error) setLoading(false);
    }, 800);

    return () => {
      unsubscribeGroups();
      unsubscribeStudents();
      unsubscribePayments();
      unsubscribeExpenses();
    };
  }, [user, retryCount]);

  const financialData = useMemo(() => {
    let revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    let expenses = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
    let debt = 0;
    
    // Create lookups
    const groupCycles: { [key: string]: number } = {};
    const groupPrices: { [key: string]: number } = {};
    groups.forEach(g => {
      if (g.id) {
        groupCycles[g.id] = g.sessionsPerMonth || 4;
        groupPrices[g.id] = g.price || 0;
      }
    });

    students.forEach(s => {
      debt += DebtService.calculateDebtAmount(s);
    });

    const netProfit = revenue - expenses;
    const totalIncomeOrDebt = revenue + debt;
    
    // Avoid division by zero
    const revenuePercentage = totalIncomeOrDebt > 0 ? (revenue / totalIncomeOrDebt) * 100 : 0;
    const debtPercentage = totalIncomeOrDebt > 0 ? (debt / totalIncomeOrDebt) * 100 : 0;

    return {
      revenue,
      debt,
      expenses,
      netProfit,
      revenuePercentage,
      debtPercentage
    };
  }, [groups, students, payments, expensesList]);

  const { revenue, debt, expenses, netProfit, revenuePercentage, debtPercentage } = financialData;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 backdrop-blur-md pt-6 pb-4 border-b border-gray-200">
        <div className="px-4 flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 text-gray-500 hover:text-[#0B2545] transition-colors rounded-full active:bg-gray-100">
            <ChevronRight className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-[#0B2545]">المالية الشاملة</h1>
          <div className="w-10 flex justify-end">
             <Logo className="w-8 h-8" />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        
        {/* Content handling error */}
        {error && (
          <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100 flex flex-col items-center gap-3">
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
        
        {!error && (
          <>
            {/* Net Profit Card */}
            <section className="bg-gradient-to-br from-[#0B2545] to-[#1a385f] rounded-3xl p-6 shadow-xl relative overflow-hidden text-white border border-[#C5A059]/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm border border-white/5">
                <Wallet className="w-6 h-6 text-[#C5A059]" />
             </div>
             <p className="text-white/80 text-sm font-medium mb-1">صافي الأرباح</p>
             {loading ? (
                <div className="h-10 w-32 bg-white/20 rounded animate-pulse"></div>
             ) : (
                <h2 className="text-4xl font-bold text-[#C5A059] tracking-tight">{formatCurrency(netProfit)}</h2>
             )}
          </div>
        </section>

        {/* 2x2 Grid of Stats */}
        <section className="grid grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="bg-cream rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-green-100 flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1">إجمالي المداخيل</p>
              {loading ? (
                 <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                 <h3 className="text-lg font-bold text-[#0B2545]">{formatCurrency(revenue)}</h3>
              )}
            </div>
          </div>

          {/* Debt */}
          <div className="bg-cream rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-red-100 flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1">الديون المستحقة</p>
              {loading ? (
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-lg font-bold text-[#0B2545]">{formatCurrency(debt)}</h3>
              )}
            </div>
          </div>
          
           {/* Expenses (Placeholder for Future) */}
          <div className="bg-cream rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col gap-3 col-span-2">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <p className="text-gray-500 text-xs font-semibold">المصاريف</p>
              </div>
              {loading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <h3 className="text-lg font-bold text-[#0B2545]">{formatCurrency(expenses)}</h3>
              )}
            </div>
          </div>
        </section>

        {/* Progress Bar Chart */}
        <section className="bg-cream rounded-2xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-[#0B2545]" />
            <h3 className="text-sm font-bold text-[#0B2545]">معدل التحصيل المالي</h3>
          </div>

          <div className="space-y-4">
             {/* Labels */}
             <div className="flex justify-between text-xs font-semibold">
               <span className="text-green-600 flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div> المحصل
               </span>
               <span className="text-red-500 flex items-center gap-1">
                 الديون <div className="w-2 h-2 rounded-full bg-red-500"></div>
               </span>
             </div>

             {/* Bar */}
             <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
               {!loading && (
                 <>
                   <div 
                     className="h-full bg-green-500 transition-all duration-1000 ease-out relative" 
                     style={{ width: `${revenuePercentage}%` }}
                   ></div>
                   <div 
                     className="h-full bg-red-400 transition-all duration-1000 ease-out" 
                     style={{ width: `${debtPercentage}%` }}
                   ></div>
                 </>
               )}
             </div>

             {/* Detailed Percentages */}
             {loading ? (
                 <div className="h-4 w-full bg-gray-100 rounded animate-pulse mt-2"></div>
             ) : (
                <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                  <span>{revenuePercentage.toFixed(1)}% ({formatCurrency(revenue)})</span>
                  <span>{debtPercentage.toFixed(1)}% ({formatCurrency(debt)})</span>
                </div>
             )}
          </div>
        </section>
        </>
        )}

      </main>
    </div>
  );
}
