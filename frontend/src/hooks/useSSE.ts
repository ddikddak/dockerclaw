'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useBoardStore } from '@/lib/store'
import type { Card } from '@/lib/api'

interface SSEEvent {
  type: 'new_card' | 'card_updated' | 'card_moved' | 'card_deleted'
  card?: Card
  card_id?: string
  updates?: Partial<Card>
}

export function useSSE(agentId?: string) {
  const { addCard, updateCard, moveCard, deleteCard } = useBoardStore()
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    // Only run on client
    if (typeof window === 'undefined') return
    
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return
    }

    const url = agentId 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}/events`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/sse`

    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
      console.log('SSE connection opened')
      setIsConnected(true)
    }

    es.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)
        
        switch (data.type) {
          case 'new_card':
            if (data.card) {
              addCard(data.card)
            }
            break
          case 'card_updated':
            if (data.card_id && data.updates) {
              updateCard(data.card_id, data.updates)
            }
            break
          case 'card_moved':
            if (data.card_id && data.updates?.status) {
              moveCard(data.card_id, data.updates.status as Card['status'])
            }
            break
          case 'card_deleted':
            if (data.card_id) {
              deleteCard(data.card_id)
            }
            break
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error)
      }
    }

    es.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
      es.close()
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting SSE reconnection...')
        connect()
      }, 3000)
    }
  }, [agentId, addCard, updateCard, moveCard, deleteCard])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return
    
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { isConnected }
}
