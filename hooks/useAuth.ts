'use client';

/**
 * File: hooks/useAuth.ts
 *
 * Description:
 * React hook that exposes Supabase authentication state and common auth actions.
 *
 * Responsibilities:
 * - Track the current Supabase session/user
 * - Provide `signInWithGoogle` and `signOut` helpers
 *
 * Used in:
 * - Pages that need auth gating (e.g., `/`, `/chat`)
 * - Components that need the current user/session
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/**
 * Description:
 * Provides session/user state plus convenience methods for sign-in and sign-out.
 *
 * Returns:
 *     An object containing:
 *     - session: The current Supabase session (or null)
 *     - user: The authenticated user (or null)
 *     - loading: Whether the initial session check is still in progress
 *     - signInWithGoogle: Starts Google OAuth sign-in
 *     - signOut: Signs out and clears local state
 *
 * Notes:
 * - Internally subscribes to Supabase auth state changes and unsubscribes on cleanup.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Perform initial session check once on mount.
    /**
     * Description:
     * Retrieves the current Supabase session and updates local state.
     *
     * Returns:
     *     A Promise that resolves once state has been updated.
     */
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    }

    checkSession()

    // Keep local state in sync with Supabase auth events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  /**
   * Description:
   * Initiates Google OAuth sign-in.
   *
   * Returns:
   *     A Promise that resolves when the redirect flow has been initiated.
   *
   * Notes:
   * - Uses `/chat` as the post-auth redirect.
   */
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/chat`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  /**
   * Description:
   * Signs the user out in Supabase and clears local auth state.
   *
   * Returns:
   *     A Promise that resolves once sign-out completes.
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSession(null)
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return {
    session,
    user,
    loading,
    signInWithGoogle,
    signOut,
  }
}
