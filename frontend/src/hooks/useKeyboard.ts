'use client'

import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  preventDefault?: boolean
}

interface UseKeyboardOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboard({ shortcuts, enabled = true }: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      for (const shortcut of shortcuts) {
        const isCtrl = shortcut.ctrl ? event.ctrlKey : true
        const isMeta = shortcut.meta ? event.metaKey : true
        const isShift = shortcut.shift ? event.shiftKey : true
        const isAlt = shortcut.alt ? event.altKey : true
        const isKey = event.key.toLowerCase() === shortcut.key.toLowerCase()

        if (isCtrl && isMeta && isShift && isAlt && isKey) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler()
          return
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Hook específic per a shortcuts globals de l'app
export function useAppKeyboard({ 
  onNewCard, 
  onNewTemplate, 
  onSearch,
  onEscape 
}: {
  onNewCard?: () => void
  onNewTemplate?: () => void
  onSearch?: () => void
  onEscape?: () => void
} = {}) {
  const isDashboard = typeof window !== 'undefined' && window.location.pathname === '/'
  const isTemplates = typeof window !== 'undefined' && window.location.pathname.startsWith('/templates')

  useKeyboard({
    shortcuts: [
      // Cmd/Ctrl + K per obrir cerca
      {
        key: 'k',
        meta: true,
        handler: () => {
          onSearch?.()
        },
      },
      {
        key: 'k',
        ctrl: true,
        handler: () => {
          onSearch?.()
        },
      },
      // N per nova card (només dashboard)
      {
        key: 'n',
        handler: () => {
          if (isDashboard) {
            onNewCard?.()
          }
        },
      },
      // T per nova template (només templates)
      {
        key: 't',
        handler: () => {
          if (isTemplates) {
            onNewTemplate?.()
          }
        },
      },
      // Escape per tancar modals
      {
        key: 'Escape',
        handler: () => {
          onEscape?.()
        },
      },
    ],
  })
}

export default useKeyboard
