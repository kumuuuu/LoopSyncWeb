/**
 * File: hooks/use-mobile.ts
 *
 * Description:
 * React hook that reports whether the viewport is currently considered "mobile".
 *
 * Responsibilities:
 * - Track viewport changes via `matchMedia`
 * - Provide a boolean `isMobile` for responsive UI behavior
 *
 * Used in:
 * - Components that need to adjust layout/behavior for small screens
 */

import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Description:
 * Determines whether the current viewport is below the mobile breakpoint.
 *
 * Returns:
 *     `true` when the viewport is smaller than the breakpoint; otherwise `false`.
 *
 * Notes:
 * - Uses `matchMedia` to react to viewport changes.
 * - Returns `false` during the first render until the effect runs.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    // Sync state whenever the media query changes (viewport resize/orientation).
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
