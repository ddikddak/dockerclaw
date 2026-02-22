'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { DynamicForm, validateDynamicForm } from '@/components/DynamicForm'
import { CardPreview } from '@/components/CardPreview'
import { api, Card } from '@/lib/api'
import type { Template } from '@/types/template'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutTemplate, 
  FileText, 
  Eye, 
  CheckCircle,
  Loader2,
  Plus,
  ArrowLeft
} from 'lucide-react'

// Steps del wizard
type Step = 'template' | 'form' | 'preview'

export default function NewCardPage() {
  const router = useRouter()
  
  // State
  const [step, setStep] = useState<Step>('template')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [tags, setTags] = useState<string[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Carregar templates
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true)
      try {
        const { templates } = await api.getTemplates()
        setTemplates(templates)
      } catch (error) {
        toast.error('Failed to load templates')
        console.error(error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    loadTemplates()
  }, [])

  // Seleccionar template
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template)
    // Inicialitzar valors amb el títol per defecte si existeix
    const initialValues: Record<string, any> = {}
    template.components.forEach(comp => {
      if (comp.type === 'checklist') {
        initialValues[comp.id] = []
      } else if (comp.type === 'code') {
        initialValues[comp.id] = { content: '', language: comp.language || 'typescript' }
      } else if (comp.type === 'image') {
        initialValues[comp.id] = null
      } else {
        initialValues[comp.id] = ''
      }
    })
    setFormValues(initialValues)
    setStep('form')
  }, [])

  // Canviar valors del formulari
  const handleFormChange = useCallback((values: Record<string, any>) => {
    setFormValues(values)
  }, [])

  // Validar i anar al preview
  const handleGoToPreview = useCallback(() => {
    if (!selectedTemplate) return
    
    const { valid, errors } = validateDynamicForm(selectedTemplate.components, formValues)
    
    if (!valid) {
      toast.error(`Please fill required fields: ${errors.join(', ')}`)
      return
    }
    
    setStep('preview')
  }, [selectedTemplate, formValues])

  // Guardar card
  const handleSave = useCallback(async () => {
    if (!selectedTemplate) return
    
    setIsSaving(true)
    try {
      // Preparar dades
      const data: Record<string, any> = {
        ...formValues,
        tags
      }
      
      // Si hi ha un camp title o name, posar-lo al nivell superior també
      if (formValues.title) {
        data.title = formValues.title
      } else if (formValues.name) {
        data.title = formValues.name
      }

      const card: Card = await api.createCard({
        template_id: selectedTemplate.id,
        data,
        tags
      })
      
      toast.success('Card created successfully!')
      router.push(`/cards/${card.id}`)
    } catch (error) {
      toast.error('Failed to create card')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedTemplate, formValues, tags, router])

  // Tornar enrere
  const handleBack = useCallback(() => {
    if (step === 'form') {
      setStep('template')
      setSelectedTemplate(null)
    } else if (step === 'preview') {
      setStep('form')
    }
  }, [step])

  // Renderitzar step indicator
  const renderStepIndicator = () => {
    const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
      { id: 'template', label: 'Template', icon: <LayoutTemplate className="h-4 w-4" /> },
      { id: 'form', label: 'Fill Data', icon: <FileText className="h-4 w-4" /> },
      { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> },
    ]

    const currentIndex = steps.findIndex(s => s.id === step)

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          
          return (
            <div key={s.id} className="flex items-center">
              <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : isCompleted
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  s.icon
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Renderitzar selector de template
  const renderTemplateSelector = () => {
    if (isLoadingTemplates) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )
    }

    if (templates.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-4">Create a template first to create cards from it.</p>
          <Link href="/templates/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </Link>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <UICard 
            key={template.id}
            className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all border-gray-200"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <LayoutTemplate className="h-8 w-8 text-purple-500" />
                <Badge variant="secondary" className="text-xs">
                  {template.components.length} fields
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {template.components.slice(0, 4).map((comp, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {comp.type}
                  </Badge>
                ))}
                {template.components.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.components.length - 4}
                  </Badge>
                )}
              </div>
            </CardContent>
          </UICard>
        ))}
      </div>
    )
  }

  // Renderitzar formulari
  const renderForm = () => {
    if (!selectedTemplate) return null

    return (
      <div className="max-w-2xl mx-auto">
        <UICard className="border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-purple-500" />
                  {selectedTemplate.name}
                </CardTitle>
                {selectedTemplate.description && (
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Separator className="mb-6" />
            
            <DynamicForm
              components={selectedTemplate.components}
              values={formValues}
              onChange={handleFormChange}
              readOnly={false}
            />
            
            <Separator className="my-6" />
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button onClick={handleGoToPreview}>
                Preview
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  // Renderitzar preview
  const renderPreview = () => {
    if (!selectedTemplate) return null

    return (
      <CardPreview
        template={selectedTemplate}
        values={formValues}
        tags={tags}
        onTagsChange={setTags}
        onBack={() => setStep('form')}
        onSave={handleSave}
        isSaving={isSaving}
      />
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center">Create New Card</h1>
            <p className="text-gray-500 text-center mt-1">
              Follow the steps to create a card from a template
            </p>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Content */}
          <div className="mt-8">
            {step === 'template' && renderTemplateSelector()}
            {step === 'form' && renderForm()}
            {step === 'preview' && renderPreview()}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
