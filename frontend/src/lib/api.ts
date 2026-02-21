import { createClient } from '@supabase/supabase-js'

// Client Supabase per al frontend (accedeix directament a la BD)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL o SUPABASE_ANON_KEY no configurades')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  emoji: '👍' | '❤️' | '🎉' | '🚀' | '👀' | '✅'
  created_at: string
}

// API Client usa Supabase directament
class ApiClient {
  // Cards
  async getCards(): Promise<{ cards: Card[] }> {
    const { data, error } = await supabase
      .from('Card')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return { cards: data || [] }
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
  async approveCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'approved' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async rejectCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async deleteCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'deleted' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }

  async archiveCard(id: string): Promise<Card> {
    const { data, error } = await supabase
      .from('Card')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
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

  async addComment(cardId: string, content: string, authorName: string = 'User'): Promise<Comment> {
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
    return data
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('Comment')
      .delete()
      .eq('id', commentId)
    
    if (error) throw new Error(error.message)
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

  async toggleReaction(cardId: string, emoji: string): Promise<void> {
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
    } else {
      // Crear si no existeix
      await supabase.from('Reaction').insert({
        card_id: cardId,
        emoji,
        author_type: 'human',
        author_id: authorId,
      })
    }
  }

  // Templates
  async getTemplates(): Promise<{ templates: any[] }> {
    const { data, error } = await supabase
      .from('Template')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(error.message)
    return { templates: data || [] }
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

  // Upload
  async uploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
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
    
    return {
      url: publicUrl,
      filename,
      size: file.size,
    }
  }

  // API Keys - Ara el frontend no gestiona API keys (només agents)
  // Aquestes funcions s'han eliminat ja que el frontend no necessita API keys
}

export const api = new ApiClient()
