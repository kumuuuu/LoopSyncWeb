'use client'

import MessageBubble from './MessageBubble'
import type { Message } from '@/app/chat/page'

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to Loop Sync Chat Agent
          </h2>
          <p className="text-muted-foreground">
            Start a conversation by typing a message below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}
        </div>
      </div>
    </div>
  )
}
