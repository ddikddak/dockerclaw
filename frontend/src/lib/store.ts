import { create } from 'zustand'
import type { Card } from '@/lib/api'

interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  isDragging: boolean
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setIsDragging: (isDragging: boolean) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(2, zoom)) }),
  setPan: (pan) => set({ pan }),
  zoomIn: () => set((state) => ({ zoom: Math.min(2, state.zoom + 0.1) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.5, state.zoom - 0.1) })),
  resetZoom: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
  setIsDragging: (isDragging) => set({ isDragging }),
}))

interface BoardState {
  cards: Card[]
  isLoading: boolean
  error: string | null
  selectedCardId: string | null
  setCards: (cards: Card[]) => void
  addCard: (card: Card) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  updateCardPosition: (id: string, x: number, y: number) => void
  moveCard: (id: string, newStatus: Card['status']) => void
  deleteCard: (id: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setSelectedCardId: (id: string | null) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  cards: [],
  isLoading: false,
  error: null,
  selectedCardId: null,
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, ...updates } : card
      ),
    })),
  updateCardPosition: (id, x, y) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, x, y } : card
      ),
    })),
  moveCard: (id, newStatus) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id ? { ...card, status: newStatus } : card
      ),
    })),
  deleteCard: (id) =>
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedCardId: (id) => set({ selectedCardId: id }),
}))
