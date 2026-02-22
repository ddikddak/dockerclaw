'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { TemplateEditor } from '@/components/TemplateEditor'
import { api } from '@/lib/api'
import { Template } from '@/types/template'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const data = await api.getTemplate(id)
        setTemplate(data)
      } catch (error) {
        toast.error('Failed to load template')
        console.error(error)
        router.push('/templates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [id, router])

  const handleSave = useCallback(async (updates: Parameters<typeof api.updateTemplate>[1]) => {
    try {
      await api.updateTemplate(id, updates)
      toast.success('Template updated successfully')
      router.push('/templates')
    } catch (error) {
      toast.error('Failed to update template')
      console.error(error)
    }
  }, [id, router])

  const handleCancel = useCallback(() => {
    router.push('/templates')
  }, [router])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center bg-[#f5f5f5]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MainLayout>
    )
  }

  if (!template) {
    return null
  }

  return (
    <MainLayout>
      <div className="h-full p-6 bg-[#f5f5f5] overflow-auto">
        <TemplateEditor
          mode="edit"
          initialTemplate={template}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </MainLayout>
  )
}
