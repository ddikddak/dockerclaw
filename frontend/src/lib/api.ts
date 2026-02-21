import { supabaseClient } from '@/contexts/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

// Debug: Log the actual value (will appear in browser console)
console.log('[DEBUG] NEXT_PUBLIC_API_URL:', API_URL)
console.log('[DEBUG] NEXT_PUBLIC_API_URL type:', typeof API_URL)

// Validate API_URL is configured
if (!API_URL) {
  throw new Error('NO ENV VARIABLE found: NEXT_PUBLIC_API_URL is not configured. Please set it in Vercel environment variables.')
}

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

export interface Comment {
  id: string
  card_id: string
  author_type: 'human' | 'agent'
  author_id: string
  author_name: string
  content: string
  created_at: string
  updated_at?: string
}

export interface Reaction {
  id: string
  card_id: string
  author_type: 'human' | 'agent'
  author_id: string
  author_name?: string
  emoji: '👍' | '❤️' | '🎉' | '🚀' | '👀' | '✅'
  created_at: string
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

// Obtenir API key des de localStorage o variable d'entorn
function getApiKey(): string {
  // En el browser, intentem obtenir-la del localStorage
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('dockerclaw_api_key')
    if (storedKey) return storedKey
  }
  // Fallback a la variable d'entorn (per compatibilitat)
  return API_KEY
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      return session?.access_token ?? null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Copiar headers existents
    if (options?.headers) {
      const existingHeaders = options.headers as Record<string, string>
      Object.keys(existingHeaders).forEach(key => {
        headers[key] = existingHeaders[key]
      })
    }
    
    // Afegir API key - prioritat a localStorage, després variable d'entorn
    const apiKey = getApiKey()
    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
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

  async createCard(card: { template_id: string; data: Record<string, any> }): Promise<Card> {
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
    
    // Per upload, necessitem afegir la API key manualment
    const apiKey = getApiKey()
    const uploadHeaders: Record<string, string> = {}
    if (apiKey) {
      uploadHeaders['X-API-Key'] = apiKey
    }
    
    const uploadResponse = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    })
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || 'Failed to upload image')
    }
    
    const { url, filename, size } = await uploadResponse.json()
    
    return this.executeComponentAction(cardId, componentId, {
      action: 'upload_image',
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

  // Comments
  async getComments(cardId: string): Promise<{ comments: Comment[] }> {
    return this.fetch(`/api/cards/${cardId}/comments`)
  }

  async addComment(
    cardId: string, 
    content: string, 
    options?: { author_type?: 'human' | 'agent'; author_id?: string; author_name?: string }
  ): Promise<{ success: boolean; comment: Comment }> {
    return this.fetch(`/api/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        author_type: options?.author_type || 'human',
        author_id: options?.author_id,
        author_name: options?.author_name,
      }),
    })
  }

  async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
    })
  }

  // Reactions
  async getReactions(cardId: string): Promise<{ reactions: Reaction[] }> {
    return this.fetch(`/api/cards/${cardId}/reactions`)
  }

  async toggleReaction(
    cardId: string, 
    emoji: Reaction['emoji'],
    options?: { author_type?: 'human' | 'agent'; author_id?: string; author_name?: string }
  ): Promise<{ success: boolean; action: 'added' | 'removed'; reaction?: Reaction }> {
    return this.fetch(`/api/cards/${cardId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({
        emoji,
        author_type: options?.author_type || 'human',
        author_id: options?.author_id,
        author_name: options?.author_name,
      }),
    })
  }

  // Activity
  async getActivity(options?: { 
    targetId?: string; 
    targetType?: string; 
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: any[] }> {
    const params = new URLSearchParams()
    if (options?.targetId) params.set('targetId', options.targetId)
    if (options?.targetType) params.set('targetType', options.targetType)
    if (options?.actorId) params.set('actorId', options.actorId)
    if (options?.action) params.set('action', options.action)
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.offset) params.set('offset', options.offset.toString())
    
    return this.fetch(`/api/activity?${params.toString()}`)
  }

  // Notifications
  async getNotifications(options?: { unreadOnly?: boolean; limit?: number }): Promise<{ notifications: any[] }> {
    const params = new URLSearchParams()
    if (options?.unreadOnly) params.set('unread', 'true')
    if (options?.limit) params.set('limit', options.limit.toString())
    
    return this.fetch(`/api/notifications?${params.toString()}`)
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.fetch('/api/notifications?count=true')
  }

  async markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
    return this.fetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id: notificationId }),
    })
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.fetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ all: true }),
    })
  }

  // API Keys
  async getApiKeys(): Promise<{ keys: any[] }> {
    return this.fetch('/api/keys')
  }

  async createApiKey(name: string): Promise<any> {
    return this.fetch('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async revokeApiKey(id: string): Promise<any> {
    return this.fetch(`/api/keys/${id}`, {
      method: 'DELETE',
    })
  }
}

export const api = new ApiClient(API_URL)
