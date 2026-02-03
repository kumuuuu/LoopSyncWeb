import { createClient } from '@supabase/supabase-js'

// Note: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is safe to expose publicly
// This is Supabase's publishable/anon key specifically designed for client-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// A minimal stub that provides the auth methods the app uses so importing this module
// doesn't throw at module evaluation time when env vars are missing (useful for dev).
const supabaseStub = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ error: new Error('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') }),
    signOut: async () => ({ error: new Error('Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') }),
  },
} as any

if (!supabaseUrl || !supabaseKey) {
  // Helpful runtime message for developers — this is preferable to the cryptic "supabaseUrl is required" error
  // that comes from the official client when given an empty string.
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
