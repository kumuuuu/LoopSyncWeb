/**
 * File: app/layout.tsx
 *
 * Description:
 * Next.js root layout for the application.
 *
 * Responsibilities:
 * - Define global metadata (title, description, icons)
 * - Load global styles and fonts
 * - Wrap all pages in the root HTML/body structure
 *
 * Used in:
 * - Next.js App Router root layout (applies to all routes)
 */

import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Loop Sync',
  description: 'Chat with an AI agent that detects and explains ambiguous prompts',
  icons: {
    icon: [
      {
        url: '/Loop_Sync_Icon.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/Loop_Sync_Icon.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/Loop_Sync_Icon.png',
        type: 'image/svg+xml',
      },
    ],
    apple: '/Loop_Sync_Icon.png',
  },
}

/**
 * Description:
 * Renders the root HTML scaffold for all pages.
 *
 * Args:
 *     children: The page content for the current route.
 *
 * Returns:
 *     The app's root HTML/layout wrapper.
 *
 * Notes:
 * - This is a server component layout; avoid client-only hooks here.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
