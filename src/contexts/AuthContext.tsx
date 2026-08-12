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
         setUser(null);
         setIsPro(false);
         setLoading(false);
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
    // ملاحظة أمنية حول كلمة المرور: هذا المستخدم لا يسجل الدخول أبداً عبر
    // البريد الإلكتروني/كلمة المرور — تسجيل الدخول يتم حصرياً عبر رقم الهاتف
    // (OTP). لذلك كلمة المرور ليست سراً يتحقق منه أي شخص، بل هي فقط متطلب تقني
    // من Supabase Auth (الحد الأدنى: 6 أحرف).
    // الجزء العشوائي يأتي من crypto.randomUUID() الذي يولد 122 بت من الانتروبيا
    // (معيار RFC 4122)، فلا يمكن تخمينها ولا استغلالها. لاحقة '!Aa1' لا تنقص
    // الانتروبيا الفعلية لأنها ثابتة ومعروفة.
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
      console.error('Supabase Auth failed.', err);
      // No local fallback: authentication must always happen through Supabase.
      // Allowing an unauthenticated local user would bypass every RLS check
      // (which relies on a real auth.uid()) and the free-tier enforcement.
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
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
