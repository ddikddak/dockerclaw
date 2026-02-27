// ============================================
// HTTP Client - Simple fetch wrapper
// ============================================

import { API_CONFIG, DEFAULT_HEADERS } from '@/config/api';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(error.error || `HTTP ${response.status}`, response.status, error);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(error.error || `HTTP ${response.status}`, response.status, error);
  }

  return response.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'DELETE',
    headers: DEFAULT_HEADERS,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(error.error || `HTTP ${response.status}`, response.status, error);
  }

  return response.json();
}
