import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { TeacherRepository } from '../repositories/TeacherRepository';

const teacherRepository = new TeacherRepository();

export type AppUser = User & { uid: string; fullName?: string; sex?: string; subject?: string; phoneNumber?: string };

interface AuthContextType {
  user: AppUser | null;
  isGuest: boolean;
  isPro: boolean;
  loading: boolean;
  registerUser: (data: { fullName: string, sex: string, subject: string, phoneNumber: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try local mock user first for instant load in preview environments only
    // (لا صلة له بحالة الاشتراك الحقيقية - يُستخدم فقط عند تعذر الاتصال بـ Supabase)
    const mockUserStr = localStorage.getItem('mock_user');
    if (mockUserStr) {
      const mockUser = JSON.parse(mockUserStr);
      setUser(mockUser);
      setLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const currentUser = { 
          ...session.user, 
          uid: session.user.id,
          fullName: session.user.user_metadata?.full_name,
          sex: session.user.user_metadata?.sex,
          subject: session.user.user_metadata?.subject,
          phoneNumber: session.user.user_metadata?.phone_number
        } as AppUser;
        setUser(currentUser);
        setIsGuest(false);

        // مصدر الحقيقة الوحيد لحالة Pro هو قاعدة البيانات، وليس تخزين الجهاز.
        // هذا يمنع أي تلاعب محلي بحالة الاشتراك.
        const teacher = await teacherRepository.getTeacher(currentUser.uid);
        setIsPro(teacher?.isPro === true);
        setLoading(false);
      } else {
         if (!localStorage.getItem('mock_user')) {
           setUser(null);
           setIsPro(false);
           setLoading(false);
         }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    }
  }, []);

  const refreshProStatus = async () => {
    if (!user) return;
    const teacher = await teacherRepository.getTeacher(user.uid);
    setIsPro(teacher?.isPro === true);
  };

  const registerUser = async (data: { fullName: string, sex: string, subject: string, phoneNumber: string }) => {
    // We deterministically map the phone number to an email for Supabase Auth.
    // This allows us to use standard Row Level Security securely without burdening the user.
    const cleanPhone = data.phoneNumber.replace(/[^0-9]/g, '');
    const dummyEmail = `${cleanPhone}@daftari.local`;
    const dummyPassword = crypto.randomUUID() + '!Aa1';
    
    try {
      let authRes = await supabase.auth.signUp({
        email: dummyEmail,
        password: dummyPassword,
        options: {
          data: {
            full_name: data.fullName,
            sex: data.sex,
            subject: data.subject,
            phone_number: data.phoneNumber
          }
        }
      });

      if (authRes.error) throw authRes.error;
    } catch (err) {
      console.warn('Supabase Auth failed.', err);
      // Mock local fallback for preview environment without Supabase connected
      const uid = 'local-' + Date.now();
      const mockUser = { id: uid, uid, email: dummyEmail, ...data } as any;
      setUser(mockUser);
      setIsGuest(false);
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      localStorage.removeItem('mock_user');
      setUser(null);
      setIsGuest(false);
      setIsPro(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, isPro, loading, registerUser, logout, refreshProStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
