import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Auth Configuration', () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  it('should have EXPO_PUBLIC_SUPABASE_URL configured', () => {
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).not.toBe('');
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should have EXPO_PUBLIC_SUPABASE_ANON_KEY configured', () => {
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseAnonKey).not.toBe('');
  });

  it('should be able to create Supabase client', () => {
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should be able to connect to Supabase', async () => {
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    
    // Test connection by getting session (should return null for anonymous)
    const { data, error } = await supabase.auth.getSession();
    
    // Should not have connection error
    expect(error).toBeNull();
    // Session should be null for anonymous user
    expect(data.session).toBeNull();
  });
});
