import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Classroom } from '../domain/models';
import { dbService } from '../services/dbService';

export const useClassrooms = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setClassrooms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = dbService.classrooms.subscribe(
      user.uid,
      (data) => {
        setClassrooms(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to classrooms:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addClassroom = async (classroom: Omit<Classroom, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("Not authenticated");
    return dbService.classrooms.add({
      ...classroom,
      userId: user.uid
    });
  };

  const updateClassroom = async (id: string, updates: Partial<Classroom>) => {
    if (!user) throw new Error("Not authenticated");
    return dbService.classrooms.edit(user.uid, id, updates);
  };

  const deleteClassroom = async (id: string) => {
    if (!user) throw new Error("Not authenticated");
    return dbService.classrooms.delete(user.uid, id);
  };

  return {
    classrooms,
    loading,
    error,
    addClassroom,
    updateClassroom,
    deleteClassroom
  };
};
