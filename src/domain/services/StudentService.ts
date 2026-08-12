import { IStudentRepository } from '../repositories/interfaces';
import { Student } from '../models';

export class StudentService {
  constructor(private studentRepo: IStudentRepository) {}

  async addStudent(
    userId: string,
    groupId: string,
    studentData: Pick<Student, 'fullName' | 'phoneNumber' | 'customPrice'>
  ): Promise<string> {
    if (!studentData.fullName || studentData.fullName.trim() === '') {
      throw new Error('Student name is required.');
    }

    // Default initialization rules for a new student
    const newStudent: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
      ...studentData,
      userId,
      groupId,
      isDeleted: false,
      sessionBalance: 0
    };

    return this.studentRepo.add(newStudent);
  }

  async editStudent(
    userId: string,
    studentId: string,
    updates: Pick<Student, 'fullName' | 'phoneNumber' | 'customPrice'>
  ): Promise<void> {
    if (updates.fullName !== undefined && updates.fullName.trim() === '') {
      throw new Error('Student name cannot be empty.');
    }

    const dataToUpdate: Partial<Student> = {
      fullName: updates.fullName,
      phoneNumber: updates.phoneNumber
    };

    if (updates.customPrice !== undefined) {
      dataToUpdate.customPrice = updates.customPrice;
    } else {
      dataToUpdate.customPrice = null as any; // Using any for null since TS may complain depending on config
    }

    await this.studentRepo.edit(userId, studentId, dataToUpdate);
  }

  async softDeleteStudent(userId: string, studentId: string): Promise<void> {
    await this.studentRepo.update(userId, studentId, { isDeleted: true });
  }

  async restoreStudent(userId: string, studentId: string): Promise<void> {
    await this.studentRepo.update(userId, studentId, { isDeleted: false });
  }
}
