# Frontend Class Diagram

## Classes

### Class: Message
- id: string
- content: string
- role: MessageRole
- timestamp: Date

### Class: MessageRole (enum)
- USER
- ASSISTANT

### Class: Conversation
- id: number
- messages: Message[]

### Class: ChatState
- messages: Message[]
- conversationId: number | null
- isLoading: boolean
- initialized: boolean

### Class: AuthState (useAuth)
- session: SupabaseSession | null
- user: SupabaseUser | null
- loading: boolean

### Class: SupabaseSession (external: @supabase/supabase-js)
- access_token: string
- user: SupabaseUser

### Class: SupabaseUser (external: @supabase/supabase-js)
- email: string | null
- user_metadata: UserMetadata

### Class: UserMetadata
- avatar_url: string | undefined
- avatarUrl: string | undefined

### Class: InitializeUserRequest
- authorizationBearerToken: string

### Class: InitializeUserResponse
- payload: unknown

### Class: SendMessageRequest
- authorizationBearerToken: string
- conversationId: number | undefined
- content: string

### Class: SendMessageJsonResponse
- conversationId: number | undefined
- response: string | undefined
- content: string | undefined

### Class: SendMessageStreamResponse
- conversationIdHeader: number | undefined
- streamedText: string

## Relationships
- ChatState *-- Message : contains
- Conversation *-- Message : contains
- Message --> MessageRole : uses

- AuthState --> SupabaseSession : uses
- AuthState --> SupabaseUser : uses
- SupabaseSession --> SupabaseUser : contains
- SupabaseUser *-- UserMetadata : contains

- SendMessageRequest --> Conversation : associates via conversationId
- SendMessageJsonResponse --> Conversation : associates via conversationId
- SendMessageStreamResponse --> Conversation : associates via conversationIdHeader

- InitializeUserRequest --> SupabaseSession : uses (access_token)
- InitializeUserRequest --> SupabaseUser : initializes on backend

## Notes
- `Conversation` and `ChatState` are inferred from the state in `app/chat/page.tsx` (messages + conversationId) even though only `conversationId` is sent to the backend.
- The app calls an external backend at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`), not Next.js route handlers (the `app/api/*` folders are present but contain no `route.ts`).
- `SendMessageJsonResponse` is inferred from client usage: it reads `conversationId`, and uses either `response` or `content` as assistant text.
- `SendMessageStreamResponse` is inferred from the streaming path: response body is treated as text chunks, and conversation id may be returned via `x-conversation-id` header.
- `SupabaseSession`/`SupabaseUser` fields are limited to what the frontend reads (`access_token`, `user`, `email`, avatar fields). The actual Supabase types contain additional attributes.
