import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Student } from "../types";
import { dbService } from "../services/dbService";

import { StudentValidator } from '../domain/validators/StudentValidator';

export const useStudents = (groupId: string) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = () => setRetryCount((prev) => prev + 1);

  useEffect(() => {
    if (!groupId || !user) return;

    setLoading(true);
    const unsubscribe = dbService.students.subscribeByGroup(
      user.uid,
      groupId,
      (fetchedStudents) => {
        setStudents(fetchedStudents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching students: ", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [groupId, user, retryCount]);

  const addStudent = async (
    studentData: Pick<
      Student,
      | "fullName"
      | "phoneNumber"
      | "parentPhone"
      | "customPrice"
      | "joiningDate"
      | "notes"
    >,
  ) => {
    if (!user) throw new Error("لم يتم تسجيل الدخول. يرجى تسجيل الدخول أولاً.");

    const validation = StudentValidator.validate({ fullName: studentData.fullName, phoneNumber: studentData.phoneNumber });
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    try {
      return await dbService.students.add({
        ...studentData,
        userId: user.uid,
        groupId,
        isDeleted: false,
      });
    } catch (err: any) {
      console.error("Add student error:", err);
      throw err;
    }
  };

  const editStudent = async (
    studentId: string,
    studentData: Pick<
      Student,
      | "fullName"
      | "phoneNumber"
      | "parentPhone"
      | "customPrice"
      | "joiningDate"
      | "notes"
    >,
  ) => {
    const validation = StudentValidator.validate({ fullName: studentData.fullName, phoneNumber: studentData.phoneNumber });
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    try {
      const dataToUpdate: any = {
        fullName: studentData.fullName,
        phoneNumber: studentData.phoneNumber,
        parentPhone: studentData.parentPhone,
        notes: studentData.notes,
        joiningDate: studentData.joiningDate,
      };
      
      if (studentData.customPrice !== undefined) {
        dataToUpdate.customPrice = studentData.customPrice;
      } else {
        dataToUpdate.customPrice = null;
      }
      
      await dbService.students.edit(user!.uid, studentId, dataToUpdate);
    } catch (err: any) {
      console.error("Edit student error:", err);
      throw err;
    }
  };

  const softDeleteStudent = async (studentId: string) => {
    try {
      await dbService.students.update(user!.uid, studentId, { isDeleted: true });
    } catch (err: any) {
      console.error("Soft delete error:", err);
      throw err;
    }
  };

  const restoreStudent = async (studentId: string) => {
    try {
      await dbService.students.update(user!.uid, studentId, { isDeleted: false });
    } catch (err: any) {
      console.error("Restore error:", err);
      throw err;
    }
  };

  const confirmSession = async (
    sessionId: string,
    groupPaymentAmount: number,
    groupPaymentCycleSessions: number,
    draftAttendance: Record<string, 'present' | 'absent' | 'excused'>,
    draftPayment: Record<string, boolean>,
  ) => {
    if (!user) throw new Error("لم يتم تسجيل الدخول. يرجى تسجيل الدخول أولاً.");

    await dbService.students.confirmSession(
      user.uid,
      groupId,
      sessionId,
      students,
      groupPaymentAmount,
      groupPaymentCycleSessions,
      draftAttendance,
      draftPayment,
    );
  };

  return {
    students,
    loading,
    error,
    addStudent,
    editStudent,
    softDeleteStudent,
    restoreStudent,
    confirmSession,
    retry,
  };
};
