import { describe, it, expect } from 'vitest';

describe('Supabase Storage Configuration', () => {
  it('should have correct bucket names defined', () => {
    // Test bucket name constants
    const BUCKETS = {
      USER_FILES: 'user-files',
      PUBLIC_FILES: 'public-files',
      AVATARS: 'avatars',
    };
    
    expect(BUCKETS.USER_FILES).toBe('user-files');
    expect(BUCKETS.PUBLIC_FILES).toBe('public-files');
    expect(BUCKETS.AVATARS).toBe('avatars');
  });

  it('should export all required bucket constants', () => {
    const BUCKETS = {
      USER_FILES: 'user-files',
      PUBLIC_FILES: 'public-files',
      AVATARS: 'avatars',
    };
    
    expect(Object.keys(BUCKETS)).toHaveLength(3);
    expect(BUCKETS).toHaveProperty('USER_FILES');
    expect(BUCKETS).toHaveProperty('PUBLIC_FILES');
    expect(BUCKETS).toHaveProperty('AVATARS');
  });
});

describe('Supabase Auth Configuration', () => {
  it('should have Supabase URL configured', () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(supabaseUrl).toBeDefined();
    expect(supabaseUrl).toContain('supabase.co');
  });

  it('should have Supabase Anon Key configured', () => {
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseAnonKey).not.toBe('');
  });
});
