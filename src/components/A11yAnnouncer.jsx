import React from 'react'

/**
 * Screen-Reader Live Region Announcer
 * Ensures all status changes and critical verdict alerts are announced to assistive technologies.
 */
export default function A11yAnnouncer({ message, assertive = false }) {
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
