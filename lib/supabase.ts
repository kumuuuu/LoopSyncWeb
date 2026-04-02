/**
 * File: lib/supabase.ts
 *
 * Description:
 * Creates (or safely stubs) a Supabase client used by the app's auth flows.
 *
 * Responsibilities:
 * - Read Supabase connection settings from public environment variables
 * - Export a `supabase` client that won't throw during module evaluation when env vars are missing
 *
 * Used in:
 * - Auth hook: `useAuth`
 * - Any module that needs Supabase auth methods
 */

import { createClient } from '@supabase/supabase-js'

// Supabase publishable/anon key intended for client-side usage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Minimal stub so importing this module doesn't throw when env vars are missing.
const supabaseStub = {
  auth: {
    /**
     * Description:
     * Stubbed session retrieval.
     *
     * Returns:
     *     A resolved shape compatible with the Supabase client response.
     */
    getSession: async () => ({ data: { session: null } }),
    /**
     * Description:
     * Stubbed auth state listener.
     *
     * Args:
     *     _callback: Listener callback (ignored).
     *
     * Returns:
     *     A subscription-like object with an `unsubscribe` no-op.
     */
    onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    /**
     * Description:
     * Stubbed OAuth sign-in.
     *
     * Returns:
     *     An error indicating Supabase is not configured.
     */
    signInWithOAuth: async () => ({ error: new Error('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') }),
    /**
     * Description:
     * Stubbed sign-out.
     *
     * Returns:
     *     An error indicating Supabase is not configured.
     */
    signOut: async () => ({ error: new Error('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') }),
  },
} as any

if (!supabaseUrl || !supabaseKey) {
  // Provide a clearer dev-time warning than the default client error.
  if (typeof window !== 'undefined') {
    // Client-side runtime
    // eslint-disable-next-line no-console
    console.warn(
      'Supabase environment variables are not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to your .env.local. The app will run with a stubbed supabase client in development.'
    )
  } else {
    // Server-side build/runtime
    // eslint-disable-next-line no-console
    console.warn(
      'Supabase environment variables are not set. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to your environment variables.'
    )
  }
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : supabaseStub
