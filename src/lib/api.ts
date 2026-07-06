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
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch (e) {
      // Response wasn't JSON — fall back to whatever text the server sent,
      // or to a default if the body was empty.
      errorMessage = errorText?.trim() || errorMessage;
    }
    // Prefix with status + URL so 500s are immediately diagnosable from the
    // thrown error message (the response body alone often just says
    // "Internal Server Error" with no context).
    const finalMessage = `${response.status} ${response.statusText || ''} on ${endpoint} — ${errorMessage}`.trim();
    // eslint-disable-next-line no-console
    console.error(`[api] ${finalMessage}`, { status: response.status, body: errorText });
    throw new Error(finalMessage);
  }

  return await response.json();
};

export const api = {
  get: (url: string) => request(url, { method: 'GET' }),
  post: (url: string, data?: any) => request(url, { method: 'POST', data }),
  put: (url: string, data?: any) => request(url, { method: 'PUT', data }),
  delete: (url: string, data?: any) => request(url, { method: 'DELETE', data }),
};
