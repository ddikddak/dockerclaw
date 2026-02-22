export interface TemplateComponent {
  id: string
  type: 'text' | 'checklist' | 'image' | 'code'
  label: string
  required?: boolean
  placeholder?: string
  multiline?: boolean        // per text
  language?: string          // per code
  maxFiles?: number          // per image (default: 1)
}

export interface Template {
  id: string
  name: string
  description?: string
  components: TemplateComponent[]
  created_at: string
}
