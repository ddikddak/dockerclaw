'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { TemplateEditor } from '@/components/TemplateEditor'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function NewTemplatePage() {
  const router = useRouter()

  const handleSave = useCallback(async (template: Parameters<typeof api.createTemplate>[0]) => {
    try {
      await api.createTemplate(template)
      toast.success('Template created successfully')
      router.push('/templates')
    } catch (error) {
      toast.error('Failed to create template')
      console.error(error)
    }
  }, [router])

  const handleCancel = useCallback(() => {
    router.push('/templates')
  }, [router])

  return (
    <MainLayout>
      <div className="h-full p-6 bg-[#f5f5f5] overflow-auto">
        <TemplateEditor
          mode="create"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </MainLayout>
  )
}
