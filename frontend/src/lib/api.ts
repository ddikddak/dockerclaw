const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export type CardType = 'text' | 'code' | 'checklist' | 'image' | 'rich_text' | 'data'

export interface Card {
  id: string
  template_id: string
  agent_id: string
  data: {
    title?: string
    description?: string
    type?: CardType
    content?: string
    checklist?: { text: string; checked: boolean }[]
    items?: { text: string; checked: boolean }[]
    language?: string
    // Image
    url?: string
    filename?: string
    size?: number
    // Rich text
    html?: string
    // Data/JSON
    json?: object | string
    [key: string]: any
  }
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'archived' | 'deleted'
  created_at: string
  updated_at?: string
}

export interface CardAction {
  action: 'approve' | 'reject' | 'delete' | 'archive' | 'move'
  payload?: Record<string, any>
}

export interface ComponentAction {
  action: 'edit_text' | 'edit_code' | 'toggle_check' | 'add_comment' | 'upload_image'
  payload: Record<string, any>
}

export interface ActionResponse {
  success: boolean
  action: {
    id: string
    card_id: string
    agent_id: string
    type: string
    action: string
    payload: Record<string, any>
    status: string
    created_at: string
  }
  card: {
    id: string
    status?: string
    data?: Record<string, any>
  }
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
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Cards
  async getCards(): Promise<{ cards: Card[] }> {
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

  // Card Actions
  async executeCardAction(id: string, action: CardAction): Promise<ActionResponse> {
    return this.fetch(`/api/cards/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    })
  }

  async approveCard(id: string): Promise<ActionResponse> {
    return this.executeCardAction(id, { action: 'approve' })
  }

  async rejectCard(id: string): Promise<ActionResponse> {
    return this.executeCardAction(id, { action: 'reject' })
  }

  async deleteCard(id: string): Promise<ActionResponse> {
    return this.executeCardAction(id, { action: 'delete' })
  }

  async archiveCard(id: string): Promise<ActionResponse> {
    return this.executeCardAction(id, { action: 'archive' })
  }

  async moveCard(id: string, column: string): Promise<ActionResponse> {
    return this.executeCardAction(id, { action: 'move', payload: { column } })
  }

  // Component Actions
  async executeComponentAction(
    cardId: string, 
    componentId: string, 
    action: ComponentAction
  ): Promise<ActionResponse> {
    return this.fetch(`/api/cards/${cardId}/components/${componentId}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    })
  }

  async editText(cardId: string, componentId: string, text: string): Promise<ActionResponse> {
    return this.executeComponentAction(cardId, componentId, {
      action: 'edit_text',
      payload: { text },
    })
  }

  async editCode(cardId: string, componentId: string, code: string): Promise<ActionResponse> {
    return this.executeComponentAction(cardId, componentId, {
      action: 'edit_code',
      payload: { text: code },
    })
  }

  async toggleCheck(cardId: string, componentId: string, itemIndex: number): Promise<ActionResponse> {
    return this.executeComponentAction(cardId, componentId, {
      action: 'toggle_check',
      payload: { itemIndex },
    })
  }

  async uploadImage(cardId: string, componentId: string, file: File): Promise<ActionResponse> {
    // First upload to storage API, then update component
    const formData = new FormData()
    formData.append('file', file)
    formData.append('cardId', cardId)
    
    const uploadResponse = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || 'Failed to upload image')
    }
    
    const { url, filename, size } = await uploadResponse.json()
    
    return this.executeComponentAction(cardId, componentId, {
      action: 'edit_text',
      payload: { url, filename, size, type: 'image' },
    })
  }

  // Templates
  async getTemplates(): Promise<{ templates: any[] }> {
    return this.fetch('/api/templates')
  }

  async createTemplate(template: { name: string; schema: Record<string, any> }): Promise<any> {
    return this.fetch('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  // Agent
  async registerAgent(agent: { name: string; email: string; webhook_url?: string }): Promise<any> {
    return this.fetch('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify(agent),
    })
  }

  async getAgentEvents(agentId: string, apiKey: string): Promise<{ events: any[] }> {
    return this.fetch(`/api/agents/${agentId}/events`, {
      headers: {
        'X-API-Key': apiKey,
      },
    })
  }
}

export const api = new ApiClient(API_URL)
