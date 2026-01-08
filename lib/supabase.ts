import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://thruqscgucnlsyxwhoqz.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that we have a key before creating the client
if (!supabaseAnonKey) {
  console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase features will not work.');
  console.warn('[Supabase] To fix: Create a .env file with EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key');
}

// Create Supabase client with AsyncStorage for React Native
// Note: Supabase client requires a valid key. If key is missing, client creation may fail.
// For development, you can use a minimal valid JWT format, but actual API calls will fail.
const key = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnVxc2NndWNubHN5eHdob3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAxMjM0NTAsImV4cCI6MjAyNTY5OTQ1MH0.dummy';
export const supabase = createClient(supabaseUrl, key, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Auth helper functions
export const signUpWithEmail = async (email: string, password: string, metadata?: { name?: string; phone?: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: Platform.OS === 'web' 
        ? `${window.location.origin}/oauth/callback`
        : 'thimmah://oauth/callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
};

// Apple Sign-In
export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: Platform.OS === 'web' 
        ? `${window.location.origin}/oauth/callback`
        : 'thimmah://oauth/callback',
    },
  });
  return { data, error };
};

// Resend email verification
export const resendVerificationEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  return { data, error };
};

// Verify email with OTP token
export const verifyEmail = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data, error };
};

// Update user password
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

// Update user profile
export const updateProfile = async (updates: { name?: string; phone?: string; avatar_url?: string }) => {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Platform.OS === 'web'
      ? `${window.location.origin}/reset-password`
      : 'thimmah://reset-password',
  });
  return { data, error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
