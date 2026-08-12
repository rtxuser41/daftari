import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Expense } from '../types';
import { dbService } from '../services/dbService';

export const useFinance = (groupId: string) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user) return;
    setLoading(true);

    let paymentsLoaded = false;
    let expensesLoaded = false;
    const checkLoading = () => {
      if (paymentsLoaded && expensesLoaded) setLoading(false);
    };

    const unsubPayments = dbService.finance.subscribePayments(user.uid, groupId, (fetched) => {
      setPayments(fetched);
      paymentsLoaded = true;
      checkLoading();
    });

    const unsubExpenses = dbService.finance.subscribeExpenses(user.uid, groupId, (fetched) => {
      setExpenses(fetched);
      expensesLoaded = true;
      checkLoading();
    });

    return () => {
      unsubPayments();
      unsubExpenses();
    };
  }, [groupId, user]);

  const addExpense = async (expenseData: { description: string, amount: number, date: Date }) => {
    if (!user) throw new Error("Not authenticated");
    try {
      await dbService.finance.addExpense({
        ...expenseData,
        userId: user.uid,
        groupId
      });
    } catch (error) {
      console.error("Add expense error", error);
      throw error;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!user) throw new Error("Not authenticated");
    try {
      await dbService.finance.deleteExpense(user.uid, expenseId);
    } catch (error) {
      console.error("Delete expense error", error);
      throw error;
    }
  };

  return {
    payments,
    expenses,
    loading,
    addExpense,
    deleteExpense
  };
};
