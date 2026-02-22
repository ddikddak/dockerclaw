'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { DynamicForm, validateDynamicForm } from '@/components/DynamicForm'
import { TagInput } from '@/components/TagInput'
import { api, Card } from '@/lib/api'
import type { Template } from '@/types/template'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, ArrowLeft, Save, X, LayoutTemplate } from 'lucide-react'

export default function CardEditPage() {
  const params = useParams()
  const router = useRouter()
  const cardId = params.id as string

  const [card, setCard] = useState<Card | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [tags, setTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar card i template
  useEffect(() => {
    const loadData = async () => {
      if (!cardId) return

      setIsLoading(true)
      setError(null)

      try {
        // Carregar card
        const fetchedCard = await api.getCard(cardId)
        setCard(fetchedCard)

        // Carregar template
        const fetchedTemplate = await api.getTemplate(fetchedCard.template_id)
        setTemplate(fetchedTemplate)

        // Inicialitzar formulari amb dades existents
        const initialValues: Record<string, any> = {}
        fetchedTemplate.components.forEach(comp => {
          const value = fetchedCard.data[comp.id]
          if (value !== undefined) {
            initialValues[comp.id] = value
          } else {
            // Valors per defecte
            if (comp.type === 'checklist') {
              initialValues[comp.id] = []
            } else if (comp.type === 'code') {
              initialValues[comp.id] = { content: '', language: comp.language || 'typescript' }
            } else if (comp.type === 'image') {
              initialValues[comp.id] = null
            } else {
              initialValues[comp.id] = ''
            }
          }
        })
        setFormValues(initialValues)

        // Inicialitzar tags
        const existingTags = fetchedCard.data?.tags || []
        setTags(Array.isArray(existingTags) ? existingTags : [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load card'
        setError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [cardId])

  // Canviar valors del formulari
  const handleFormChange = useCallback((values: Record<string, any>) => {
    setFormValues(values)
  }, [])

  // Guardar canvis
  const handleSave = useCallback(async () => {
    if (!template) return

    // Validar
    const { valid, errors } = validateDynamicForm(template.components, formValues)
    if (!valid) {
      toast.error(`Please fill required fields: ${errors.join(', ')}`)
      return
    }

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

      await api.updateCard(cardId, { data, tags })
      
      toast.success('Card updated successfully!')
      router.push(`/cards/${cardId}`)
    } catch (err) {
      toast.error('Failed to update card')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }, [template, formValues, tags, cardId, router])

  // Cancel·lar
  const handleCancel = useCallback(() => {
    router.push(`/cards/${cardId}`)
  }, [cardId, router])

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-500">Loading card...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error || !card || !template) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#f5f5f5] px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>

            <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
              <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Card not found
              </h2>
              <p className="text-gray-500 mb-6">
                {error || "The card you're looking for doesn't exist or has been deleted."}
              </p>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Edit Card</h1>
              <p className="text-sm text-gray-500">Make changes and save</p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulari principal */}
            <div className="lg:col-span-2">
              <UICard className="border-gray-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="h-5 w-5 text-purple-500" />
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-6" />
                  
                  <DynamicForm
                    components={template.components}
                    values={formValues}
                    onChange={handleFormChange}
                    readOnly={false}
                  />
                </CardContent>
              </UICard>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags Card */}
              <UICard className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Tags
                    <Badge variant="secondary" className="text-xs">
                      {tags.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TagInput
                    value={tags}
                    onChange={setTags}
                    placeholder="Add tags..."
                  />
                </CardContent>
              </UICard>

              {/* Actions Card */}
              <UICard className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </CardContent>
              </UICard>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
