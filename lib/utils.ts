/**
 * File: lib/utils.ts
 *
 * Description:
 * Shared utility helpers used across the UI.
 *
 * Responsibilities:
 * - Provide a safe way to compose conditional className strings
 *
 * Used in:
 * - UI components and pages that build Tailwind className strings
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Description:
 * Combines className inputs and resolves Tailwind class conflicts.
 *
 * Args:
 *     inputs: Class name values (strings, arrays, objects) supported by `clsx`.
 *
 * Returns:
 *     A single merged className string.
 *
 * Notes:
 * - `clsx` handles conditional inclusion; `tailwind-merge` de-dupes conflicting classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
