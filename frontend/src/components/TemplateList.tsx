'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateCard } from './TemplateCard'
import { TemplateEmptyState } from './TemplateEmptyState'
import { Template } from '@/types/template'
import { Plus } from 'lucide-react'

interface TemplateListProps {
  templates: Template[]
  isLoading?: boolean
}

function TemplateSkeleton() {
  return (
    <div className="bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-1/2 mt-2 animate-pulse" />
        </div>
      </div>
    </div>
  )
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
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <TemplateSkeleton key={i} />
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
          <h1 className="text-lg font-medium text-gray-900">Templates</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          onClick={handleNewTemplate}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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