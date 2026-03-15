import Constants from 'expo-constants';
import { useUserStore } from '../store/userStore';

export function getBackendUrl(): string {
  const extra = Constants.expoConfig?.extra;
  return extra?.EXPO_PUBLIC_BACKEND_URL || extra?.EXPO_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';
}

export function getAuthHeaders(): Record<string, string> {
  const token = useUserStore.getState().authToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${getBackendUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  return response;
}

/**
 * Register this device/user with the backend and store the returned JWT.
 * Safe to call multiple times — the backend re-issues a valid token.
 */
export async function registerAndGetToken(userId: string, name: string): Promise<string | null> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name }),
    });
    if (!response.ok) {
      console.error('Auth register failed:', response.status);
      return null;
    }
    const data = await response.json();
    return data.token ?? null;
  } catch (error) {
    console.error('Auth register error:', error);
    return null;
  }
}
