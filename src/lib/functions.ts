/**
 * Edge function invoker that always uses the Supabase project URL from env vars.
 * Works for both Lovable Cloud and self-hosted VPS / Docker Supabase deployments.
 *
 * On Lovable Cloud: VITE_SUPABASE_URL = https://<project>.supabase.co
 * On Self-hosted:   VITE_SUPABASE_URL = https://your-vps-domain (or http://localhost:8000)
 *
 * Auth token is retrieved via supabase.auth.getSession() so it works regardless
 * of the custom domain / localStorage key variant used by the Supabase client.
 */

import { supabase } from '@/integrations/supabase/client';

// Resolved at build time from .env — works on both Cloud and self-hosted VPS
export const SUPABASE_PROJECT_URL: string = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Returns the current user's Bearer token using supabase.auth.getSession().
 * This works regardless of the custom domain / localStorage key used by the client.
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
