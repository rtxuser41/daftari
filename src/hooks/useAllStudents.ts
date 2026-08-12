import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Student } from '../types';
import { dbService } from '../services/dbService';

export const useAllStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = dbService.students.subscribeAll(
      user.uid,
      (fetchedStudents) => {
        setStudents(fetchedStudents);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching all students: ', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { students, loading };
};
