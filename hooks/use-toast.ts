'use client'

/**
 * File: hooks/use-toast.ts
 *
 * Description:
 * Minimal toast state container and hook used by the UI toast components.
 *
 * Responsibilities:
 * - Provide `toast()` API for showing toasts
 * - Track toast lifecycle: add, update, dismiss, and remove
 *
 * Used in:
 * - UI notifications via `useToast()` and `toast()`
 *
 * Notes:
 * - This implementation is conceptually inspired by "react-hot-toast", but tailored
 *   to the local UI kit and types.
 */

import * as React from 'react'

import type { ToastActionElement, ToastProps } from '@/components/ui/toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

/**
 * Description:
 * Generates a unique (per-session) toast id.
 *
 * Returns:
 *     A string id.
 *
 * Notes:
 * - Uses a simple incrementing counter to keep ids stable and predictable.
 */
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Description:
 * Schedules a toast for removal after a delay.
 *
 * Args:
 *     toastId: Toast identifier.
 *
 * Returns:
 *     void
 *
 * Notes:
 * - Ensures we only schedule one removal timeout per toast.
 */
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                /**
                 * Description:
                 * Pure reducer for toast state transitions.
                 *
                 * Args:
                 *     state: Current toast state.
                 *     action: State transition action.
                 *
                 * Returns:
                 *     The next toast state.
                 *
                 * Notes:
                 * - `DISMISS_TOAST` schedules removals via `addToRemoveQueue`.
                 */
                open: false,
              }
            : t,
        ),
      }
                      // `DISMISS_TOAST` triggers removal scheduling; keeping it here keeps the public API small.
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

/**
 * Description:
 * Dispatches an action, updates in-memory state, and notifies all listeners.
 *
 * Args:
 *     action: Reducer action.
 *
 * Returns:
 *     void
 *
 * Notes:
 * - This module keeps toast state outside React so any component can publish toasts.
 */
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, 'id'>

/**
 * Description:
 * Creates and displays a toast.
 *
 * Args:
 *     props: Toast content and behavior.
 *
 * Returns:
 *     Control helpers for the created toast (id, dismiss, update).
 *
 * Notes:
 * - `update()` and `dismiss()` target the specific toast instance by id.
 */
function toast({ ...props }: Toast) {
  const id = genId()

  /**
   * Description:
   * Updates the current toast instance by id.
   *
   * Args:
   *     props: New toast properties.
   *
   * Returns:
   *     void
   */
  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })

  /**
   * Description:
   * Dismisses the current toast instance by id.
   *
   * Returns:
   *     void
   */
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

/**
 * Description:
 * React hook that subscribes a component to toast state updates.
 *
 * Returns:
 *     The current toast state plus helper methods:
 *     - toast: create a toast
 *     - dismiss: dismiss a specific toast or all toasts
 *
 * Notes:
 * - Subscription is managed via a module-level listeners array.
 */
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }
