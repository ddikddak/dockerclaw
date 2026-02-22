'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComponentBuilder } from './ComponentBuilder'
import { ComponentPreview } from './ComponentPreview'
import { Template, TemplateComponent } from '@/types/template'
import { ArrowLeft, Save, X } from 'lucide-react'

interface TemplateEditorProps {
  mode: 'create' | 'edit'
  initialTemplate?: Template
  onSave: (template: Omit<Template, 'id' | 'created_at'>) => Promise<void>
  onCancel?: () => void
}

export function TemplateEditor({ 
  mode, 
  initialTemplate, 
  onSave, 
  onCancel 
}: TemplateEditorProps) {
  const router = useRouter()
  const [name, setName] = useState(initialTemplate?.name || '')
  const [description, setDescription] = useState(initialTemplate?.description || '')
  const [components, setComponents] = useState<TemplateComponent[]>(
    initialTemplate?.components || []
  )
  const [isSaving, setIsSaving] = useState(false)

  const isValid = useMemo(() => {
    return name.trim().length > 0 && components.length > 0
  }, [name, components])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      router.push('/templates')
    }
  }, [onCancel, router])

  const handleSave = useCallback(async () => {
    if (!isValid) return

    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        components,
      })
    } finally {
      setIsSaving(false)
    }
  }, [isValid, name, description, components, onSave])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'New Template' : 'Edit Template'}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'create' 
                ? 'Create a reusable template with custom components' 
                : 'Update your template configuration'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Validation hints */}
      {!isValid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <ul className="list-disc list-inside space-y-1">
            {name.trim().length === 0 && (
              <li>Template name is required</li>
            )}
            {components.length === 0 && (
              <li>Add at least one component</li>
            )}
          </ul>
        </div>
      )}

      {/* Main content - 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column - Editor */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Template Details
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bug Report, Feature Request"
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">
                Description
                <span className="text-gray-400 font-normal"> (optional)</span>
              </Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this template is for..."
                rows={3}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Components
              <span className="text-red-500 ml-1">*</span>
            </h2>
            <ComponentBuilder
              components={components}
              onChange={setComponents}
            />
          </div>
        </div>

        {/* Right column - Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <ComponentPreview components={components} />
        </div>
      </div>
    </div>
  )
}
