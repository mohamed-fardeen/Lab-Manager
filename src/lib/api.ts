import { supabase } from './supabase';

const BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

const request = async (endpoint: string, options: RequestOptions = {}) => {
  // 1. Get current session
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 2. Prepare headers
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 3. Handle body
  let body = options.body;
  if (options.data && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.data);
  } else if (options.data instanceof FormData) {
    body = options.data;
    // Don't set Content-Type for FormData, browser does it with boundary
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body,
  });

  if (response.status === 401) {
    console.warn('Unauthorized! Potential session expiry.');
    // Force sign-out on the frontend to clean up any stale/invalid session state
    supabase.auth.signOut().catch(console.error);
    throw new Error('Authorization token required or expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'API Request Failed';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
};

export const api = {
  get: (url: string) => request(url, { method: 'GET' }),
  post: (url: string, data?: any) => request(url, { method: 'POST', data }),
  put: (url: string, data?: any) => request(url, { method: 'PUT', data }),
  delete: (url: string) => request(url, { method: 'DELETE' }),
};
