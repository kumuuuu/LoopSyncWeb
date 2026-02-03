'use client'

import MessageBubble from './MessageBubble'
import type { Message } from '@/app/chat/page'

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to Chat Agent
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}
      </div>
    </div>
  )
}
