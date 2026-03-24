/**
 * Edge function invoker that always uses the direct Supabase project URL.
 * This is needed for VPS / custom domain deployments where VITE_SUPABASE_URL
 * may be set to a custom domain that doesn't route edge function calls correctly.
 */

import { supabase } from '@/integrations/supabase/client';

export const SUPABASE_PROJECT_URL = 'https://nckmcsbjwopunctljakr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ja21jc2Jqd29wdW5jdGxqYWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzQ3NjgsImV4cCI6MjA4NjA1MDc2OH0.OAVOQgiQvRQ8L_CQuIugIaZ5SEYQd1I6CxUk6LRa_fs';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Returns the current user's Bearer token using supabase.auth.getSession(),
 * which works regardless of the custom domain / localStorage key used.
 */
export async function getAuthHeader(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return `Bearer ${data.session.access_token}`;
    }
  } catch {
    // fallback to anon key
  }
  return `Bearer ${SUPABASE_ANON_KEY}`;
}

export async function invokeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  try {
    const authHeader = await getAuthHeader();

    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: authHeader,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: new Error(data?.error || data?.message || `HTTP ${response.status}`),
      };
    }

    return { data: data as T, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
