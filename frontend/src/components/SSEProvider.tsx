'use client';

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSSE, SSEEvent } from '@/hooks/useSSE';

interface SSEContextType {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  cardEvents: Map<string, SSEEvent>;
  onCardEvent: (cardId: string, callback: (event: SSEEvent) => void) => (() => void);
}

const SSEContext = createContext<SSEContextType | null>(null);

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within SSEProvider');
  }
  return context;
}

interface SSEProviderProps {
  children: ReactNode;
}

export function SSEProvider({ children }: SSEProviderProps) {
  const [cardEvents, setCardEvents] = useState<Map<string, SSEEvent>>(new Map());
  const [cardListeners, setCardListeners] = useState<Map<string, Set<(event: SSEEvent) => void>>>(new Map());

  const handleMessage = useCallback((event: SSEEvent) => {
    // Store card-specific events
    if (event.cardId && typeof event.cardId === 'string') {
      setCardEvents(prev => new Map(prev).set(event.cardId as string, event));
      
      // Notify listeners
      const listeners = cardListeners.get(event.cardId as string);
      if (listeners) {
        listeners.forEach(callback => callback(event));
      }
    }
  }, [cardListeners]);

  const { isConnected, lastEvent } = useSSE({
    onMessage: handleMessage,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  const onCardEvent = useCallback((cardId: string, callback: (event: SSEEvent) => void) => {
    setCardListeners(prev => {
      const next = new Map(prev);
      const listeners = next.get(cardId) || new Set();
      listeners.add(callback);
      next.set(cardId, listeners);
      return next;
    });

    return () => {
      setCardListeners(prev => {
        const next = new Map(prev);
        const listeners = next.get(cardId);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) {
            next.delete(cardId);
          }
        }
        return next;
      });
    };
  }, []);

  const value: SSEContextType = {
    isConnected,
    lastEvent,
    cardEvents,
    onCardEvent
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
}

// Hook for components to listen to card updates
export function useCardUpdates(cardId: string | undefined, onUpdate?: (event: SSEEvent) => void) {
  const { onCardEvent, cardEvents, isConnected } = useSSEContext();
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  useEffect(() => {
    if (!cardId) return;

    // Set initial event if exists
    const existingEvent = cardEvents.get(cardId);
    if (existingEvent) {
      setLastEvent(existingEvent);
    }

    const unsubscribe = onCardEvent(cardId, (event) => {
      setLastEvent(event);
      onUpdate?.(event);
    });

    return unsubscribe;
  }, [cardId, onCardEvent, cardEvents, onUpdate]);

  return { lastEvent, isConnected };
}
