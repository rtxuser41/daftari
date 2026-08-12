import { IPaymentRepository } from '../repositories/interfaces';
import { Payment } from '../models';

export class PaymentService {
  constructor(private paymentRepo: IPaymentRepository) {}

  validatePayment(amount: number, cycleSessions: number): void {
    if (amount < 0) {
      throw new Error('Payment amount cannot be negative.');
    }
    if (cycleSessions <= 0) {
      throw new Error('Payment cycle sessions must be greater than zero.');
    }
  }
}
