/**
 * Authentication utilities
 * Handles password hashing and verification
 * 
 * REQUIRES: npm install bcrypt @types/bcrypt
 */

import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password
 * @param password - Plaintext password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plaintext password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid and error message
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (password.length < 8) {
    return { isValid: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: "كلمة المرور طويلة جداً" };
  }
  
  // At least one letter and one number
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: "كلمة المرور يجب أن تحتوي على حروف وأرقام" };
  }
  
  return { isValid: true };
}

