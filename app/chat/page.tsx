'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ChatHeader from '@/components/chat/ChatHeader'
import ChatSidebar, { SidebarInset } from '@/components/chat/ChatSidebar'
import MessageList from '@/components/chat/MessageList'
import MessageInput from '@/components/chat/MessageInput'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'

type Conversation = {
  id: string
  title: string
  updatedAt: number
  messages: Message[]
}

type ConversationSummary = {
  id: string | number
  title: string | null
  updatedAt: string | number
  createdAt?: string | number
  lastMessagePreview?: string | null
  messageCount?: number
}

type ConversationDetailResponse = {
  id: string | number
  title: string | null
  createdAt?: string
  updatedAt?: string
  messages: Array<{
    id: string | number
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    meta?: Message['meta']
  }>
}

function normalizeConversationId(id: unknown): string | null {
  if (typeof id === 'string' && id.trim()) return id
  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  return null
}

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function deriveTitleFromMessages(msgs: Message[]): string {
  const firstUser = msgs.find((m) => m.role === 'user' && (m.content || '').trim().length > 0)
  const raw = (firstUser?.content || 'New chat').trim().replace(/\s+/g, ' ')
  return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw
}

function reviveConversation(raw: any): Conversation | null {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.id !== 'string') return null
  const messages: Message[] = Array.isArray(raw.messages)
    ? raw.messages
        .map((m: any) => {
          if (!m || typeof m !== 'object') return null
          if (typeof m.id !== 'string') return null
          if (typeof m.content !== 'string') return null
          if (m.role !== 'user' && m.role !== 'assistant') return null
          return {
            id: m.id,
            content: m.content,
            role: m.role,
            timestamp: new Date(m.timestamp || Date.now()),
            meta: m.meta,
          } satisfies Message
        })
        .filter(Boolean) as Message[]
    : []

  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : deriveTitleFromMessages(messages)
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  return { id: raw.id, title, updatedAt, messages }
}

function parseUpdatedAt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const d = Date.parse(value)
    if (!Number.isNaN(d)) return d
  }
  return Date.now()
}

function parseMessageTimestamp(value: unknown): Date {
  if (typeof value === 'string') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value)
  }
  return new Date()
}

function normalizeMessageId(id: unknown): string {
  if (typeof id === 'string' && id.trim()) return id
  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  return crypto.randomUUID()
}

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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [conversationLoadError, setConversationLoadError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configurable backend base URL (public env var, available in client builds)
  // This must be set for deployed environments.
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined

  if (!API_BASE) {
    throw new Error(
      'Missing NEXT_PUBLIC_API_BASE_URL. Set it in your environment (e.g. .env.local) to the backend base URL like https://api.example.com'
    )
  }

  const fetchConversationSummaries = async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${API_BASE}/api/conversations?limit=50`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`)
      const data = (await res.json()) as ConversationSummary[]
      console.log('Conversations (backend response):', data)
      const normalized = Array.isArray(data)
        ? data
            .map((c) => {
              const id = normalizeConversationId((c as any)?.id)
              if (!id) return null
              const rawTitle = (c as any)?.title
              const title = (typeof rawTitle === 'string' && rawTitle.trim()) ? rawTitle : `Chat #${id}`
              return {
                id,
                title,
                updatedAt: parseUpdatedAt((c as any)?.updatedAt),
                messages: [],
              } satisfies Conversation
            })
            .filter(Boolean) as Conversation[]
        : []
      normalized.sort((a, b) => b.updatedAt - a.updatedAt)
      setConversations(normalized)
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    }
  }

  const fetchConversationDetail = async (id: string) => {
    if (!session?.access_token) return
    setIsLoadingConversation(true)
    setConversationLoadError(null)
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!res.ok) throw new Error(`Failed to load conversation (${res.status})`)
      const data = (await res.json()) as ConversationDetailResponse
      console.log('Conversation detail (backend response):', data)

      const loadedMessages: Message[] = Array.isArray((data as any)?.messages)
        ? (data as any).messages
            .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
            .map((m: any) => ({
              id: normalizeMessageId(m.id),
              role: m.role,
              content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
              timestamp: parseMessageTimestamp(m.timestamp ?? m.createdAt),
              meta: m.meta,
            }))
        : []

      setMessages(loadedMessages)

      // Also set the numeric conversationId used by POST /api/messages (if possible)
      const numericId = typeof (data as any)?.id === 'number' ? (data as any).id : Number((data as any)?.id)
      if (Number.isFinite(numericId)) {
        setConversationId(numericId)
      } else {
        setConversationId(null)
      }
    } catch (e: any) {
      console.error('Failed to fetch conversation detail:', e)
      setConversationLoadError(e?.message || 'Failed to load conversation')
      setMessages([])
      setConversationId(null)
    } finally {
      setIsLoadingConversation(false)
    }
  }

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

  // Fetch conversation list once we have a session
  useEffect(() => {
    if (!session?.access_token) return
    fetchConversationSummaries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !session?.access_token) return

    // Ensure there is an active conversation
    let convId = activeConversationId
    if (!convId) {
      convId = crypto.randomUUID()
      setActiveConversationId(convId)
    }

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
    const newId = crypto.randomUUID()
    setActiveConversationId(newId)
    setMessages([])
    setConversationId(null)
    setSidebarOpen(false)
  }

  const handleSelectConversation = (id: string) => {
    const found = conversations.find((c) => c.id === id)
    if (!found) return
    setActiveConversationId(found.id)
    fetchConversationDetail(found.id)
    setSidebarOpen(false)
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
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} defaultOpen={false}>
      <ChatShell
        user={user}
        onNewChat={handleNewChat}
        onSignOut={signOut}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
      >
        <main className="flex-1 flex min-w-0 flex-col">
          {conversationLoadError && (
            <div className="px-4 py-3 text-sm text-destructive">
              {conversationLoadError}
            </div>
          )}
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
          <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading || isLoadingConversation} />
        </main>
      </ChatShell>
    </SidebarProvider>
  )
}

function ChatShell({
  user,
  onNewChat,
  onSignOut,
  conversations,
  activeConversationId,
  onSelectConversation,
  children,
}: {
  user: any
  onNewChat: () => void
  onSignOut: () => Promise<void>
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  children: React.ReactNode
}) {
  const { isMobile, open, setOpen } = useSidebar()

  return (
    <div className="min-h-screen bg-background flex w-full">
      <ChatSidebar
        onNewChat={onNewChat}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={onSelectConversation}
      />

      <SidebarInset
        onMouseDown={(e) => {
          if (isMobile) return
          if (!open) return
          // Clicking anywhere in the inset closes the offcanvas sidebar.
          // We intentionally keep it simple (no portals/refs) to match the current UI kit behavior.
          setOpen(false)
        }}
      >
        <ChatHeader user={user} onNewChat={onNewChat} onSignOut={onSignOut} />
        {children}
      </SidebarInset>
    </div>
  )
}
