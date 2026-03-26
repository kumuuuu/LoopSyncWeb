'use client'

import * as React from 'react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

type ConversationItem = {
  id: string
  title: string
  updatedAt: number
}

type ChatSidebarProps = {
  onNewChat: () => void
  conversations: ConversationItem[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
}

export default function ChatSidebar({
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <div className="px-2 py-1">
          <div className="text-sm font-semibold">Chats</div>
          <div className="text-xs text-muted-foreground">Previous conversations</div>
        </div>
        <Button onClick={onNewChat} variant="secondary" className="w-full">
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton aria-disabled className="cursor-default">
                    <span className="text-muted-foreground">No conversations yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                conversations.map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton
                      isActive={c.id === activeConversationId}
                      onClick={() => onSelectConversation(c.id)}
                    >
                      <span>{c.title || 'New chat'}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          Tip: Press Ctrl/Cmd + B to toggle
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export { SidebarInset }
