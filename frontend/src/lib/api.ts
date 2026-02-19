const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Card {
  id: string
  template_id: string
  agent_id: string
  data: {
    title?: string
    description?: string
    type?: 'text' | 'code' | 'checklist'
    content?: string
    checklist?: { text: string; checked: boolean }[]
    language?: string
  }
  status: 'pending' | 'in_progress' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
}

export interface CardAction {
  action: 'approve' | 'reject' | 'move'
  target_status?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getCards(): Promise<Card[]> {
    return this.fetch('/api/cards')
  }

  async getCard(id: string): Promise<Card> {
    return this.fetch(`/api/cards/${id}`)
  }

  async createCard(card: Omit<Card, 'id' | 'created_at'>): Promise<Card> {
    return this.fetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    })
  }

  async executeAction(id: string, action: CardAction): Promise<Card> {
    return this.fetch(`/api/cards/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    })
  }

  async getAgentEvents(agentId: string): Promise<EventSource> {
    return new EventSource(`${this.baseUrl}/api/agents/${agentId}/events`)
  }
}

export const api = new ApiClient(API_URL)
