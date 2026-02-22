'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TemplateCard } from './TemplateCard'
import { TemplateEmptyState } from './TemplateEmptyState'
import { Template } from '@/types/template'
import { Plus, Loader2 } from 'lucide-react'

interface TemplateListProps {
  templates: Template[]
  isLoading?: boolean
}

export function TemplateList({ templates, isLoading = false }: TemplateListProps) {
  const router = useRouter()

  const handleNewTemplate = useCallback(() => {
    router.push('/templates/new')
  }, [router])

  const handleEditTemplate = useCallback((id: string) => {
    router.push(`/templates/${id}/edit`)
  }, [router])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <TemplateEmptyState 
        variant="no-templates" 
        onCreate={handleNewTemplate}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={handleNewTemplate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => handleEditTemplate(template.id)}
          />
        ))}
      </div>
    </div>
  )
}
