import { Student } from '../models';

export class DebtService {
  /**
   * Calculates the monetary value of a student's debt.
   * With the new view, sessionBalance is exactly the outstanding debt amount.
   */
  static calculateDebtAmount(student: Student): number {
    const balance = student.sessionBalance ?? 0;
    return balance > 0 ? balance : 0;
  }

  /**
   * Calculates if a student is in debt and by how many sessions.
   * We approximate the unpaid sessions by dividing the debt amount by the session price.
   */
  static calculateDebtSessions(student: Student, groupPaymentAmount: number, groupPaymentCycleSessions: number): number {
    const debtAmount = this.calculateDebtAmount(student);
    if (debtAmount === 0) return 0;
    
    const amountToPay = student.customPrice ?? groupPaymentAmount;
    const pricePerSession = amountToPay / groupPaymentCycleSessions;
    
    return Math.floor(debtAmount / pricePerSession);
  }
}
