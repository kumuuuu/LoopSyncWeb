'use client'

import type { Ambiguity, AmbiguityClass, AmbiguitySpan, Message } from '@/app/chat/page'
import { useAuth } from '@/hooks/useAuth'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

type HighlightSpan = {
  key: string
  start: number
  end: number
  text: string
  ambiguity: Ambiguity
  span: AmbiguitySpan
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`
}

function classLabel(cls: AmbiguityClass) {
  return `Class ${cls}`
}

function sortByStartThenLength(a: HighlightSpan, b: HighlightSpan) {
  if (a.start !== b.start) return a.start - b.start
  // longer first if same start
  return (b.end - b.start) - (a.end - a.start)
}

function computeHighlightSpans(content: string, ambiguities?: Ambiguity[]): HighlightSpan[] {
  if (!ambiguities || ambiguities.length === 0) return []

  const spans: HighlightSpan[] = []
  for (const ambiguity of ambiguities) {
    const sentence = typeof ambiguity.sentence === 'string' ? ambiguity.sentence : ''
    // Try to locate the sentence inside the content; span offsets are relative to the sentence.
    const sentenceIdx = sentence ? content.indexOf(sentence) : -1

    for (const span of ambiguity.spans || []) {
      let start = -1
      let end = -1

      const relStart = span.start
      const relEnd = span.end
      const hasRelOffsets =
        Number.isInteger(relStart) &&
        Number.isInteger(relEnd) &&
        (relStart as number) >= 0 &&
        (relEnd as number) > (relStart as number)

      if (sentenceIdx !== -1 && hasRelOffsets) {
        // Translate sentence-relative offsets to message-relative offsets.
        start = sentenceIdx + (relStart as number)
        end = sentenceIdx + (relEnd as number)
      }

      const isOffsetValid = start >= 0 && end > start && end <= content.length
      if (!isOffsetValid) {
        // Fallback: find the span text within the located sentence first.
        if (sentenceIdx !== -1 && typeof span.text === 'string' && span.text.length > 0) {
          const inSentence = sentence.indexOf(span.text)
          if (inSentence !== -1) {
            start = sentenceIdx + inSentence
            end = start + span.text.length
          }
        }
      }

      const isOffsetValid2 = start >= 0 && end > start && end <= content.length
      if (!isOffsetValid2) {
        // Last resort: global match in content.
        const idx = typeof span.text === 'string' ? content.indexOf(span.text) : -1
        if (idx === -1) continue
        start = idx
        end = idx + span.text.length
      }

      spans.push({
        key: `${ambiguity.sentence_index}:${span.class}:${start}-${end}`,
        start,
        end,
        text: content.slice(start, end),
        ambiguity,
        span,
      })
    }
  }

  // Avoid overlapping highlights by keeping the earliest span; if same start, keep the longest.
  spans.sort(sortByStartThenLength)
  const nonOverlapping: HighlightSpan[] = []
  let cursor = -1
  for (const s of spans) {
    if (s.start >= cursor) {
      nonOverlapping.push(s)
      cursor = s.end
    }
  }
  return nonOverlapping
}

function ConfidenceBars({ confidence }: { confidence: Record<AmbiguityClass, number> }) {
  const order: AmbiguityClass[] = ['A', 'B', 'C', 'D']
  return (
    <div className="space-y-2">
      {order.map((cls) => {
        const value = clampConfidence(confidence?.[cls])
        return (
          <div key={cls} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium">{classLabel(cls)}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{formatPct(value)}</span>
            </div>
            <div className="h-2 w-full rounded bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.round(value * 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AmbiguityTooltipContent({ item }: { item: HighlightSpan }) {
  const { ambiguity, span } = item
  return (
    <div className="w-[280px]">
      <div className="text-[11px] font-semibold mb-2">Ambiguity</div>
      <ConfidenceBars confidence={ambiguity.class_confidence} />
      <div className="mt-3 border-t border-border/40 pt-2">
        <div className="text-[11px] font-semibold mb-1">Span details</div>
        <div className="max-h-28 overflow-y-auto pr-1 space-y-2">
          <div className="text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Sentence index</span>
              <span className="tabular-nums text-muted-foreground">{ambiguity.sentence_index}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              {ambiguity.sentence}
            </div>
          </div>
          <div className="text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Class</span>
              <span className="tabular-nums text-muted-foreground">{span.class}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Offsets</span>
              <span className="tabular-nums text-muted-foreground">{span.start}–{span.end}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Text</span>
              <span className="tabular-nums text-muted-foreground">“{span.text}”</span>
            </div>
            {span.source != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Source</span>
                <span className="tabular-nums text-muted-foreground">{String(span.source)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RenderWithAmbiguityHighlights({ message }: { message: Message }) {
  const content = message.content || ''
  const highlights = computeHighlightSpans(content, message.meta?.ambiguities)
  if (highlights.length === 0) return <>{content}</>

  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const item of highlights) {
    if (item.start > cursor) {
      parts.push(content.slice(cursor, item.start))
    }

    parts.push(
      <Tooltip key={item.key}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'rounded-sm px-0.5 underline decoration-dotted underline-offset-2',
              'bg-accent/20 text-foreground cursor-help',
              'focus:outline-none focus:ring-2 focus:ring-accent/60',
            )}
            tabIndex={0}
          >
            {content.slice(item.start, item.end)}
          </span>
        </TooltipTrigger>
        <TooltipContent
          sideOffset={8}
          className={cn(
            'bg-card text-foreground border border-border shadow-sm',
            'px-3 py-2 rounded-md',
          )}
        >
          <AmbiguityTooltipContent item={item} />
        </TooltipContent>
      </Tooltip>
    )

    cursor = item.end
  }
  if (cursor < content.length) {
    parts.push(content.slice(cursor))
  }

  return <>{parts}</>
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
          {isUser ? <RenderWithAmbiguityHighlights message={message} /> : message.content}
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
