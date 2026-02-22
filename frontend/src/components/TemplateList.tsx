'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TemplateCard } from './TemplateCard'
import { Template } from '@/types/template'
import { Plus, FileText } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No templates yet
        </h2>
        <p className="text-gray-500 mb-8 text-center max-w-sm">
          Create your first template to define reusable card structures with components like text, checklists, and images.
        </p>
        <Button 
          onClick={handleNewTemplate}
          className="bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>
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
