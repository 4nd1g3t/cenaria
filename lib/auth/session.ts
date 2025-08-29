// lib/auth/session.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_URL, COOKIE_SETTINGS } from '@/lib/config/constants';
import type { ApiStatusError } from '@/lib/types';

// Custom error classes for better error handling
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', 401);
  }
}

export class InvalidTokenError extends AuthError {
  constructor() {
    super('Invalid token', 'INVALID_TOKEN', 401);
  }
}

// Type guards and utilities
export function extractStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const apiError = error as ApiStatusError;
    return apiError.status ?? apiError.response?.status;
  }
  return undefined;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return String(error).toLowerCase();
}

export function shouldAttemptRefresh(error: unknown): boolean {
  const status = extractStatus(error);
  if (status === 401 || status === 403) return true;

  const message = normalizeErrorMessage(error);
  
  // Check for common authentication error patterns
  const authErrorPatterns = [
    /\b401\b/,
    /unauthorized/,
    /not authorized/,
    /token.*expired/,
    /token.*invalid/,
    /jwt.*expired/,
    /jwt.*invalid/
  ];

  return authErrorPatterns.some(pattern => pattern.test(message));
}

// Session management
export interface SessionCookies {
  idToken?: string;
  refreshToken?: string;
  email?: string;
}

export async function readSessionCookies(): Promise<SessionCookies> {
  const cookieStore = await cookies();
  
  return {
    idToken: cookieStore.get('idToken')?.value ||
             cookieStore.get('id_token')?.value ||
             cookieStore.get('cenaria.idToken')?.value,
    refreshToken: cookieStore.get('refreshToken')?.value,
    email: cookieStore.get('email')?.value || 
           cookieStore.get('userEmail')?.value,
  };
}

export async function setSessionCookies(tokens: {
  idToken: string;
  refreshToken?: string;
  email?: string;
}): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set('idToken', tokens.idToken, COOKIE_SETTINGS);
  
  if (tokens.refreshToken) {
    cookieStore.set('refreshToken', tokens.refreshToken, COOKIE_SETTINGS);
  }
  
  if (tokens.email) {
    cookieStore.set('email', tokens.email, COOKIE_SETTINGS);
  }
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  const cookieNames = [
    'idToken', 'id_token', 'cenaria.idToken',
    'refreshToken', 'email', 'userEmail'
  ];
  
  cookieNames.forEach(name => {
    cookieStore.set(name, '', { ...COOKIE_SETTINGS, maxAge: 0 });
  });
}

// Token validation and refresh
export async function getIdTokenOrRedirect(redirectPath: string): Promise<string> {
  const { idToken } = await readSessionCookies();
  
  if (!idToken) {
    redirect(`/signin?next=${encodeURIComponent(redirectPath)}`);
  }
  
  return idToken;
}

export async function ensureValidToken(redirectPath: string = '/pantry'): Promise<string> {
  const { idToken } = await readSessionCookies();
  
  if (!idToken) {
    throw new AuthError('No token found', 'NO_TOKEN');
  }
  
  return idToken;
}

export async function refreshSession(): Promise<string | null> {
  const { refreshToken, email } = await readSessionCookies();
  
  if (!refreshToken || !email) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new AuthError(
        'Failed to refresh token',
        'REFRESH_FAILED',
        response.status
      );
    }

    const data = await response.json() as {
      idToken?: string;
      expiresIn?: number;
    };

    if (!data.idToken) {
      throw new AuthError('Invalid refresh response', 'INVALID_REFRESH_RESPONSE');
    }

    await setSessionCookies({
      idToken: data.idToken,
      refreshToken,
      email,
    });

    return data.idToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

// Higher-order function for authenticated operations
export async function attemptWithRefresh<T>(
  redirectPath: string,
  operation: (idToken: string) => Promise<T>
): Promise<T> {
  const idToken = await ensureValidToken(redirectPath);

  try {
    return await operation(idToken);
  } catch (error) {
    if (shouldAttemptRefresh(error)) {
      const newToken = await refreshSession();
      
      if (!newToken) {
        redirect(`/signin?next=${encodeURIComponent(redirectPath)}`);
      }
      
      return await operation(newToken);
    }
    
    throw error;
  }
}