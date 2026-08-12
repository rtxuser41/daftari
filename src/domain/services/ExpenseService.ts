import { IExpenseRepository } from '../repositories/interfaces';
import { Expense } from '../models';

export class ExpenseService {
  constructor(private expenseRepo: IExpenseRepository) {}

  async addExpense(
    userId: string,
    groupId: string,
    description: string,
    amount: number,
    date: Date
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    
    if (!description || description.trim() === '') {
      throw new Error('Expense description is required.');
    }

    await this.expenseRepo.addExpense({
      userId,
      groupId,
      description,
      amount,
      date
    });
  }

  async deleteExpense(userId: string, id: string): Promise<void> {
    await this.expenseRepo.deleteExpense(userId, id);
  }
}
