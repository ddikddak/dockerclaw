import { createClient } from '@supabase/supabase-js'
import type { Template, TemplateComponent } from '@/types/template'

// Client Supabase per al frontend (accedeix directament a la BD)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL o SUPABASE_ANON_KEY no configurades')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Re-export types
export type { Template, TemplateComponent }

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
    url?: string
    filename?: string
    size?: number
    html?: string
    json?: object | string
    [key: string]: any
  }
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'archived' | 'deleted'
  x: number  // Canvas X coordinate
  y: number  // Canvas Y coordinate
  created_at: string
  updated_at?: string
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

// Action response interface for mutations
export interface ActionResponse {
  success: boolean
  action?: {
    id: string
    card_id: string
    agent_id: string
    type: string
    action: string
    payload: Record<string, any>
    status: string
    created_at: string
  }
  card?: Card
}

// API Client usa Supabase directament
class ApiClient {
  // Cards
  async getCards(): Promise<{ cards: Card[] }> {
    const { data, error } = await supabase
      .from('Card')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return { cards: data || [] }
  }

  async updateCardPosition(id: string, x: number, y: number): Promise<ActionResponse> {
    const { data, error } = await supabase
      .from('Card')
      .update({ x, y })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async getCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async createCard(card: { template_id: string; data: Record<string, any> }): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .insert({
        template_id: card.template_id,
        data: card.data,
        status: 'pending',
      })
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  // Card Actions
  async approveCard(id: string): Promise<ActionResponse> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async rejectCard(id: string): Promise<ActionResponse> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async deleteCard(id: string): Promise<ActionResponse> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'deleted' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async archiveCard(id: string): Promise<ActionResponse> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async executeCardAction(id: string, action: { action: string; payload?: Record<string, any> }): Promise<ActionResponse> {
    // Handle different actions
    switch (action.action) {
      case 'move':
        const { data: moveData, error: moveError } = await supabase
          .from('Card')
          .update({ status: action.payload?.column || 'pending' })
          .eq('id', id)
          .select()
          .single()
        if (moveError) throw new Error(moveError.message)
        return { success: true, card: moveData }
      
      case 'approve':
        return this.approveCard(id)
      
      case 'reject':
        return this.rejectCard(id)
      
      case 'delete':
        return this.deleteCard(id)
      
      case 'archive':
        return this.archiveCard(id)
      
      default:
        throw new Error(`Unknown action: ${action.action}`)
    }
  }

  // Component Actions
  async editText(cardId: string, componentId: string, text: string): Promise<ActionResponse> {
    // Get current card data
    const { data: card, error: fetchError } = await supabase
      .from('Card')
      .select('data')
      .eq('id', cardId)
      .single()
    
    if (fetchError) throw new Error(fetchError.message)
    
    // Update the data
    const updatedData = { ...card.data, content: text }
    
    const { data, error } = await supabase
      .from('Card')
      .update({ data: updatedData })
      .eq('id', cardId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async editCode(cardId: string, componentId: string, code: string): Promise<ActionResponse> {
    const { data: card, error: fetchError } = await supabase
      .from('Card')
      .select('data')
      .eq('id', cardId)
      .single()
    
    if (fetchError) throw new Error(fetchError.message)
    
    const updatedData = { ...card.data, content: code }
    
    const { data, error } = await supabase
      .from('Card')
      .update({ data: updatedData })
      .eq('id', cardId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  async toggleCheck(cardId: string, componentId: string, itemIndex: number): Promise<ActionResponse> {
    const { data: card, error: fetchError } = await supabase
      .from('Card')
      .select('data')
      .eq('id', cardId)
      .single()
    
    if (fetchError) throw new Error(fetchError.message)
    
    // Toggle the checklist item
    const items = [...(card.data.items || [])]
    if (items[itemIndex]) {
      items[itemIndex] = { ...items[itemIndex], checked: !items[itemIndex].checked }
    }
    
    const { data, error } = await supabase
      .from('Card')
      .update({ data: { ...card.data, items } })
      .eq('id', cardId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  // Comments
  async getComments(cardId: string): Promise<{ comments: Comment[] }> {
    const { data, error } = await supabase
      .from('Comment')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true })
    
    if (error) throw new Error(error.message)
    return { comments: data || [] }
  }

  async addComment(cardId: string, content: string, authorName: string = 'User'): Promise<{ success: boolean; comment: Comment }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('Comment')
      .insert({
        card_id: cardId,
        content,
        author_type: 'human',
        author_id: user?.id || 'anonymous',
        author_name: authorName,
      })
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, comment: data }
  }

  async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('Comment')
      .delete()
      .eq('id', commentId)
    
    if (error) throw new Error(error.message)
    return { success: true, message: 'Comment deleted' }
  }

  // Reactions
  async getReactions(cardId: string): Promise<{ reactions: Reaction[] }> {
    const { data, error } = await supabase
      .from('Reaction')
      .select('*')
      .eq('card_id', cardId)
    
    if (error) throw new Error(error.message)
    return { reactions: data || [] }
  }

  async toggleReaction(cardId: string, emoji: string): Promise<{ success: boolean; action: 'added' | 'removed' }> {
    const { data: { user } } = await supabase.auth.getUser()
    const authorId = user?.id || 'anonymous'
    
    // Comprovar si ja existeix
    const { data: existing } = await supabase
      .from('Reaction')
      .select('id')
      .eq('card_id', cardId)
      .eq('author_id', authorId)
      .eq('emoji', emoji)
      .single()
    
    if (existing) {
      // Eliminar si existeix
      await supabase.from('Reaction').delete().eq('id', existing.id)
      return { success: true, action: 'removed' }
    } else {
      // Crear si no existeix
      await supabase.from('Reaction').insert({
        card_id: cardId,
        emoji,
        author_type: 'human',
        author_id: authorId,
      })
      return { success: true, action: 'added' }
    }
  }

  // Templates
  async getTemplates(): Promise<{ templates: Template[] }> {
    const { data, error } = await supabase
      .from('Template')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    // Transform schema to components for compatibility
    const templates = (data || []).map((t: any) => ({
      ...t,
      components: t.schema?.components || [],
    }))
    return { templates }
  }

  async getTemplate(id: string): Promise<Template> {
    const { data, error } = await supabase
      .from('Template')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(error.message)
    return {
      ...data,
      components: data.schema?.components || [],
    }
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const { data, error } = await supabase
      .from('Template')
      .insert({
        name: template.name,
        description: template.description,
        schema: { components: template.components },
      })
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return {
      ...data,
      components: data.schema?.components || [],
    }
  }

  async updateTemplate(id: string, template: Partial<Template>): Promise<Template> {
    const updateData: any = {}
    if (template.name !== undefined) updateData.name = template.name
    if (template.description !== undefined) updateData.description = template.description
    if (template.components !== undefined) {
      updateData.schema = { components: template.components }
    }

    const { data, error } = await supabase
      .from('Template')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return {
      ...data,
      components: data.schema?.components || [],
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('Template')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(error.message)
  }

  // Activity
  async getActivity(options?: { targetId?: string; limit?: number }): Promise<{ activities: any[] }> {
    let query = supabase
      .from('Activity')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (options?.targetId) {
      query = query.eq('target_id', options.targetId)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    return { activities: data || [] }
  }

  // Notifications
  async getNotifications(options?: { limit?: number }): Promise<{ notifications: any[] }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase
      .from('Notification')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(error.message)
    return { notifications: data || [] }
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { count, error } = await supabase
      .from('Notification')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('read', false)
    
    if (error) throw new Error(error.message)
    return { count: count || 0 }
  }

  async markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('Notification')
      .update({ read: true })
      .eq('id', notificationId)
    
    if (error) throw new Error(error.message)
    return { success: true }
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('Notification')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false)
    
    if (error) throw new Error(error.message)
    return { success: true }
  }

  // Upload
  async uploadImage(cardId: string, componentId: string, file: File): Promise<ActionResponse> {
    const filename = `${Date.now()}-${file.name}`
    
    const { error: uploadError } = await supabase
      .storage
      .from('images')
      .upload(filename, file)
    
    if (uploadError) throw new Error(uploadError.message)
    
    const { data: { publicUrl } } = supabase
      .storage
      .from('images')
      .getPublicUrl(filename)
    
    // Get current card data
    const { data: card, error: fetchError } = await supabase
      .from('Card')
      .select('data')
      .eq('id', cardId)
      .single()
    
    if (fetchError) throw new Error(fetchError.message)
    
    // Update card with image URL
    const updatedData = { 
      ...card.data, 
      url: publicUrl,
      filename,
      size: file.size,
      type: 'image'
    }
    
    const { data, error } = await supabase
      .from('Card')
      .update({ data: updatedData })
      .eq('id', cardId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return { success: true, card: data }
  }

  // API Keys - Ara el frontend no gestiona API keys (només agents)
  // Aquestes funcions s'han eliminat ja que el frontend no necessita API keys

  // Tags
  async getTags(): Promise<{ tags: string[] }> {
    const { data, error } = await supabase
      .from('Card')
      .select('data')
      .not('data->tags', 'is', null)
    
    if (error) throw new Error(error.message)
    
    // Extract unique tags from all cards
    const allTags = new Set<string>()
    data?.forEach((card: any) => {
      const tags = card.data?.tags
      if (Array.isArray(tags)) {
        tags.forEach((tag: string) => {
          if (typeof tag === 'string' && tag.trim()) {
            allTags.add(tag.toLowerCase().trim())
          }
        })
      }
    })
    
    return { tags: Array.from(allTags).sort() }
  }

  async updateCardTags(id: string, tags: string[]): Promise<Card> {
    // Normalize tags: lowercase, trim, max 30 chars, max 10 tags
    const normalizedTags = tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0 && tag.length <= 30)
      .slice(0, 10)
    
    // Get current card data
    const { data: card, error: fetchError } = await supabase
      .from('Card')
      .select('data')
      .eq('id', id)
      .single()
    
    if (fetchError) throw new Error(fetchError.message)
    
    // Update card data with new tags
    const updatedData = { ...card.data, tags: normalizedTags }
    
    const { data, error } = await supabase
      .from('Card')
      .update({ data: updatedData })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }
}

export const api = new ApiClient()
