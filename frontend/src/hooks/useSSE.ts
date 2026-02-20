'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEEventType = 
  | 'connected' 
  | 'activity' 
  | `card:${string}` 
  | string;

export interface SSEEvent {
  type: string;
  [key: string]: unknown;
}

export interface UseSSEOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Listen for specific events
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          console.log('SSE connection established:', data);
        } catch (error) {
          console.error('Failed to parse connected event:', error);
        }
      });

      eventSource.addEventListener('activity', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          setLastEvent(data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse activity event:', error);
        }
      });

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsConnected(false);
        onError?.(error);

        // Close current connection
        eventSource.close();

        // Attempt to reconnect
        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
            30000 // Max 30 second delay
          );
          
          console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('SSE max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setIsConnected(false);
    }
  }, [onConnect, onError, onMessage, reconnect, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  // Subscribe to specific card events
  const subscribeToCard = useCallback((cardId: string, callback: (data: SSEEvent) => void) => {
    const eventName = `card:${cardId}`;
    
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse card event:', error);
      }
    };

    eventSourceRef.current?.addEventListener(eventName, handler);

    return () => {
      eventSourceRef.current?.removeEventListener(eventName, handler);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when visibility changes (tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connect, isConnected]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    subscribeToCard
  };
}

// Hook for listening to specific card updates
export function useCardSSE(cardId: string, onUpdate?: (data: SSEEvent) => void) {
  const { subscribeToCard, isConnected } = useSSE();
  const [lastUpdate, setLastUpdate] = useState<SSEEvent | null>(null);

  useEffect(() => {
    if (!cardId || !isConnected) return;

    const unsubscribe = subscribeToCard(cardId, (data) => {
      setLastUpdate(data);
      onUpdate?.(data);
    });

    return unsubscribe;
  }, [cardId, isConnected, subscribeToCard, onUpdate]);

  return { lastUpdate, isConnected };
}
