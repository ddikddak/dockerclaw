import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only create client if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export type Database = {
  public: {
    tables: {
      cards: {
        Row: {
          id: string
          template_id: string
          agent_id: string
          data: Record<string, unknown>
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          agent_id: string
          data?: Record<string, unknown>
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          agent_id?: string
          data?: Record<string, unknown>
          status?: string
          created_at?: string
        }
      }
    }
  }
}
