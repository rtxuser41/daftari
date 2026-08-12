import { IAttendanceRepository } from '../repositories/interfaces';
import { Student } from '../models';

export class AttendanceService {
  constructor(private attendanceRepo: IAttendanceRepository) {}

  async confirmSession(
    userId: string,
    groupId: string,
    sessionId: string,
    students: Student[],
    groupPaymentAmount: number,
    groupPaymentCycleSessions: number,
    draftAttendance: Record<string, 'present' | 'absent' | 'excused'>,
    draftPayment: Record<string, boolean>
  ): Promise<void> {
    
    // Business rules:
    // Only confirm session if students array is not empty
    if (!students || students.length === 0) {
      throw new Error('Cannot confirm session without students.');
    }
    
    if (groupPaymentAmount <= 0) {
      throw new Error('Invalid group payment amount.');
    }
    
    if (groupPaymentCycleSessions <= 0) {
      throw new Error('Invalid payment cycle sessions.');
    }

    await this.attendanceRepo.confirmSession(
      userId,
      groupId,
      sessionId,
      students,
      groupPaymentAmount,
      groupPaymentCycleSessions,
      draftAttendance,
      draftPayment
    );
  }
}
