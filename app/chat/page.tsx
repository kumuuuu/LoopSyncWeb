'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ChatHeader from '@/components/chat/ChatHeader'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  meta?: {
    ambiguities?: Ambiguity[]
  }
}

export type AmbiguityClass = 'A' | 'B' | 'C' | 'D'

export interface AmbiguitySpan {
  class: AmbiguityClass
  start: number
  end: number
  text: string
  source?: string | null
}

export interface Ambiguity {
  sentence: string
  sentence_index: number
  classes: AmbiguityClass[]
  class_confidence: Record<AmbiguityClass, number>
  spans: AmbiguitySpan[]
}

export default function ChatPage() {
  const router = useRouter()
  const { session, loading, user, signOut } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Add configurable API base URL (public env var, available in client builds)
  const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    'http://localhost:8080'

  // Initialize user on backend
  useEffect(() => {
    const initializeUser = async () => {
      if (!session?.access_token) return

      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          },
        })

        if (!response.ok) {
          throw new Error('Failed to initialize user')
        }

        const data = await response.json()
        console.log('User initialized:', data)
        setInitialized(true)
      } catch (error) {
        console.error('Error initializing user:', error)
        setInitialized(true)
      }
    }

    if (!loading && session) {
      initializeUser()
    } else if (!loading && !session) {
      router.push('/')
    }
  }, [session, loading, router])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !session?.access_token) return

    // Add user message to UI immediately
    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      content,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          conversationId: conversationId || undefined,
          content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const contentType = response.headers.get('content-type') || ''

      // If response is a stream (has a body and is not JSON), read progressively
      if (response.body && !contentType.includes('application/json')) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        const assistantId = (Date.now() + 1).toString()

        // Insert an empty assistant message that we'll update with streamed chunks
        setMessages((prev) => [
          ...prev,
          { id: assistantId, content: '', role: 'assistant', timestamp: new Date() },
        ])

        let done = false
        try {
          while (!done) {
            const { value, done: doneReading } = await reader.read()
            done = doneReading
            if (value) {
              const chunk = decoder.decode(value, { stream: true })
              // Append chunk to the assistant message
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
              )
            }
          }
        } finally {
          // ensure reader is released
          try {
            reader.releaseLock?.()
          } catch (e) {
            // ignore
          }
        }

        // Try to read conversationId from headers if provided by backend
        const convHeader = response.headers.get('x-conversation-id')
        if (!conversationId && convHeader) {
          const parsed = parseInt(convHeader, 10)
          if (!Number.isNaN(parsed)) setConversationId(parsed)
        }
      } else {
        // Non-streaming fallback: parse JSON and append the assistant message once
        const data = await response.json()
        console.log('Response received:', data)

        // Set conversation ID from first response
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId)
        }

        // If backend returned ambiguity analysis, attach it to the *user* message
        // (the user text is what contains the ambiguous spans).
        const ambiguities = (data?.analysis?.ambiguities || undefined) as
          | Message['meta']['ambiguities']
          | undefined
        if (ambiguities) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessageId ? { ...m, meta: { ...(m.meta || {}), ambiguities } } : m
            )
          )
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          // Prefer the backend's explicit LLM output field.
          // Fallbacks cover other possible backend shapes.
          content:
            data.llmOutput ||
            data.response ||
            data.content ||
            data.message ||
            (typeof data === 'string' ? data : 'No response received'),
          role: 'assistant',
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, there was an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
  }

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Router will redirect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ChatHeader user={user} onNewChat={handleNewChat} onSignOut={signOut} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
