'use client'

import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import type { User } from '@supabase/supabase-js'

interface ChatHeaderProps {
  user: User | null
  onNewChat: () => void
  onSignOut: () => Promise<void>
}

export default function ChatHeader({
  user,
  onNewChat,
  onSignOut,
}: ChatHeaderProps) {
  const handleSignOut = async () => {
    try {
      await onSignOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="w-full px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-foreground">Loop Sync Chat Agent</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={onNewChat}
            variant="outline"
            className="hidden sm:inline-flex bg-transparent"
          >
            New Chat
          </Button>

          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
            )}
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
