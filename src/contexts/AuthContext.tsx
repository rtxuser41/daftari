import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { TeacherRepository } from '../repositories/TeacherRepository';

const teacherRepository = new TeacherRepository();

export type AppUser = User & { uid: string; fullName?: string; sex?: string; subject?: string; phoneNumber?: string };

interface AuthContextType {
  user: AppUser | null;
  isGuest: boolean;
  isPro: boolean;
  loading: boolean;
  loginUser: (phoneNumber: string, password: string) => Promise<void>;
  registerUser: (data: { fullName: string; sex: string; subject: string; phoneNumber: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function syntheticEmailForPhone(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (!cleanPhone) throw new Error('يرجى إدخال رقم هاتف صالح.');
  return `${cleanPhone}@daftari.local`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const currentUser = {
          ...session.user,
          uid: session.user.id,
          fullName: session.user.user_metadata?.full_name,
          sex: session.user.user_metadata?.sex,
          subject: session.user.user_metadata?.subject,
          phoneNumber: session.user.user_metadata?.phone_number,
        } as AppUser;
        setUser(currentUser);
        setIsGuest(false);

        // The database is the only source of truth for the Pro subscription.
        const teacher = await teacherRepository.getTeacher(currentUser.uid);
        setIsPro(teacher?.isPro === true);
        setLoading(false);
      } else {
        setUser(null);
        setIsGuest(false);
        setIsPro(false);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const loginUser = async (phoneNumber: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('تسجيل الدخول غير متاح لأن إعدادات الخادم غير مكتملة.');
    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmailForPhone(phoneNumber),
      password,
    });
    if (error) throw error;
  };

  const registerUser = async (data: { fullName: string; sex: string; subject: string; phoneNumber: string; password: string }) => {
    if (!isSupabaseConfigured) throw new Error('إنشاء الحساب غير متاح لأن إعدادات الخادم غير مكتملة.');

    const { data: authData, error } = await supabase.auth.signUp({
      email: syntheticEmailForPhone(data.phoneNumber),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          sex: data.sex,
          subject: data.subject,
          phone_number: data.phoneNumber,
        },
      },
    });

    if (error) throw error;
    if (!authData.session) {
      throw new Error('لم يبدأ الحساب جلسة دخول. قد يتطلب المشروع تأكيداً عبر بريد إلكتروني اصطناعي لا يمكن استلامه؛ يلزم إعداد طريقة تحقق صالحة من مسؤول المشروع.');
    }
  };

  const refreshProStatus = async () => {
    if (!user || !isSupabaseConfigured) return;
    const teacher = await teacherRepository.getTeacher(user.uid);
    setIsPro(teacher?.isPro === true);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
    setUser(null);
    setIsGuest(false);
    setIsPro(false);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, isPro, loading, loginUser, registerUser, logout, refreshProStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
