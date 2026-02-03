'use client'

import type { Message } from '@/app/chat/page'
import { useAuth } from '@/hooks/useAuth'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const { user } = useAuth()

  // Try common avatar fields used by Supabase or custom user objects
  const avatarUrl =
    // user_metadata (Supabase) may contain avatar_url
    (user && (user as any).user_metadata && (user as any).user_metadata.avatar_url) ||
    // some systems or clients may provide avatarUrl or avatar_url directly
    (user && ((user as any).avatarUrl || (user as any).avatar_url)) ||
    undefined

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        // Render assistant avatar image from public folder
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/Loop_Sync_Icon.png"
          alt="Assistant avatar"
          className="w-8 h-8 rounded-full bg-accent object-cover shrink-0 mt-1"
        />
      )}

      <div
        className={`max-w-xs sm:max-w-2xl lg:max-w-4xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-muted text-foreground border border-border'
        }`}
      >
        <p className="text-sm sm:text-base leading-relaxed wrap-break-word">
          {message.content}
        </p>
        <p
          className={`text-xs mt-2 ${
            isUser ? 'text-accent-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && (
        // If we have an avatar URL, render the image; otherwise fall back to initial placeholder
        avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
            <span className="text-primary-foreground text-sm font-bold">U</span>
          </div>
        )
      )}
    </div>
  )
}
