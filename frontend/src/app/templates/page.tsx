'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { TemplateList } from '@/components/TemplateList'
import { api } from '@/lib/api'
import { Template } from '@/types/template'
import { toast } from 'sonner'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { templates } = await api.getTemplates()
        setTemplates(templates)
      } catch (error) {
        toast.error('Failed to load templates')
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  return (
    <MainLayout>
      <div className="h-full p-8 bg-white">
        <TemplateList templates={templates} isLoading={isLoading} />
      </div>
    </MainLayout>
  )
}