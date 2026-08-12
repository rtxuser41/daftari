import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Session } from '../domain/models';
import { dbService } from '../services/dbService';

export const useSession = (groupId: string) => {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTodaySession = useCallback(async () => {
    if (!groupId || !user) return;
    setLoading(true);
    try {
      let todaySession = await dbService.sessions.getSessionForToday(user.uid, groupId);
      
      // Automatically create today's session if it doesn't exist
      if (!todaySession) {
        const date = new Date().toISOString();
        todaySession = await dbService.sessions.createSession(user.uid, groupId, date);
      }
      
      setSession(todaySession);
      setError(null);
    } catch (err: any) {
      console.error("Error loading/creating session: ", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    loadTodaySession();
  }, [loadTodaySession]);

  const cancelSession = async () => {
    if (!session || session.confirmedAt) return;
    try {
      await dbService.sessions.deleteSession(session.id!);
      setSession(null);
    } catch (err: any) {
      console.error("Error canceling session: ", err);
      throw err;
    }
  };

  return {
    session,
    loading,
    error,
    cancelSession,
    reload: loadTodaySession
  };
};
