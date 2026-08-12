import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';
import { dbService } from '../services/dbService';
import { GroupValidator } from '../domain/validators/GroupValidator';

export const useGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const retry = () => setRetryCount(prev => prev + 1);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const unsubscribe = dbService.groups.subscribe(
        user.uid,
        (fetchedGroups) => {
          setGroups(fetchedGroups);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error fetching groups: ', err);
          setError(err.message);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [user, retryCount]);

  const addGroup = async (groupData: Omit<Group, 'id' | 'studentCount' | 'createdAt' | 'userId' | 'updatedAt'>) => {
    if (!user) throw new Error("لم يتم تسجيل الدخول. يرجى تسجيل الدخول أولاً.");
    
    const validation = GroupValidator.validate({ name: groupData.name, price: groupData.price });
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    if (groups.some(g => g.name.trim().toLowerCase() === groupData.name.trim().toLowerCase())) {
      throw new Error("توجد مجموعة بنفس الاسم مسبقاً. يرجى اختيار اسم آخر.");
    }
    
    try {
      return await dbService.groups.add({
        ...groupData,
        userId: user.uid
      });
    } catch (err: any) {
      console.error("Error adding group:", err);
      throw err;
    }
  };

  const editGroup = async (groupId: string, groupData: Partial<Group>) => {
    const validation = GroupValidator.validate({ name: groupData.name, price: groupData.price });
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    if (groupData.name) {
      if (groups.some(g => g.id !== groupId && g.name.trim().toLowerCase() === groupData.name!.trim().toLowerCase())) {
        throw new Error("توجد مجموعة أخرى بنفس الاسم مسبقاً. يرجى اختيار اسم آخر.");
      }
    }
    try {
      await dbService.groups.edit(user!.uid, groupId, groupData);
    } catch (err: any) {
      console.error("Error editing group:", err);
      throw err;
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      const lowercaseQuery = searchQuery.toLowerCase();
      const matchName = group.name.toLowerCase().includes(lowercaseQuery);
      const matchDay = group.timings?.some(t => t.day.includes(searchQuery));
      return matchName || matchDay;
    });
  }, [groups, searchQuery]);

  return {
    groups: filteredGroups,
    loading,
    error,
    addGroup,
    editGroup,
    searchQuery,
    setSearchQuery,
    retry
  };
};
