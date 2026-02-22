'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TagBadge } from '@/components/TagBadge'
import { DynamicForm } from '@/components/DynamicForm'
import { TagInput } from '@/components/TagInput'
import type { Template } from '@/types/template'
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  LayoutTemplate, 
  Tag,
  Loader2,
  Eye,
  AlertCircle
} from 'lucide-react'

interface CardPreviewProps {
  template: Template
  values: Record<string, any>
  tags: string[]
  onTagsChange: (tags: string[]) => void
  onBack: () => void
  onSave: () => Promise<void>
  isSaving?: boolean
}

export function CardPreview({ 
  template, 
  values, 
  tags, 
  onTagsChange,
  onBack, 
  onSave,
  isSaving = false
}: CardPreviewProps) {
  const [showDataSummary, setShowDataSummary] = useState(false)

  // Extreure títol de les dades
  const title = values.title || values.name || 'Untitled Card'
  
  // Comptar components emplenats
  const getFilledComponentsCount = () => {
    let count = 0
    for (const component of template.components) {
      const value = values[component.id]
      if (value !== undefined && value !== null && value !== '') {
        if (component.type === 'checklist') {
          if (Array.isArray(value) && value.length > 0) count++
        } else if (component.type === 'image' || component.type === 'code') {
          if (typeof value === 'object' ? value?.url || value?.content : !!value) count++
        } else {
          count++
        }
      }
    }
    return count
  }

  const filledCount = getFilledComponentsCount()
  const totalCount = template.components.length
  const completionPercentage = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0

  // Resum de dades per al usuari
  const renderDataSummary = () => {
    const summary: { label: string; value: string; type: string }[] = []
    
    for (const component of template.components) {
      const value = values[component.id]
      if (value === undefined || value === null) continue
      
      let displayValue = ''
      
      switch (component.type) {
        case 'text':
          displayValue = typeof value === 'string' 
            ? (value.length > 50 ? value.slice(0, 50) + '...' : value)
            : String(value)
          break
        case 'checklist':
          if (Array.isArray(value)) {
            const checked = value.filter(i => i.checked).length
            displayValue = `${checked}/${value.length} completed`
          }
          break
        case 'image':
          displayValue = typeof value === 'object' 
            ? (value.filename || 'Image uploaded')
            : 'Image'
          break
        case 'code':
          displayValue = typeof value === 'object'
            ? (value.content ? 'Code provided' : 'Empty')
            : (value ? 'Code provided' : 'Empty')
          break
      }
      
      if (displayValue) {
        summary.push({ label: component.label, value: displayValue, type: component.type })
      }
    }
    
    if (summary.length === 0) {
      return (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">No data entered yet</span>
        </div>
      )
    }
    
    return (
      <div className="space-y-2">
        {summary.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <span className="text-sm text-gray-500 truncate max-w-[200px]">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Edit
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
            <LayoutTemplate className="h-3 w-3 mr-1" />
            {template.name}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview de la Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Preview
              </CardTitle>
              <CardDescription>
                This is how your card will look when saved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Card Preview Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {/* Títol */}
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {title}
                </h2>
                
                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.map((tag, index) => (
                      <TagBadge key={`${tag}-${index}`} tag={tag} />
                    ))}
                  </div>
                )}
                
                <Separator className="my-4" />
                
                {/* Contingut */}
                <DynamicForm
                  components={template.components}
                  values={values}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar amb resum */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{filledCount} of {totalCount} fields</span>
                  <span className={`font-medium ${
                    completionPercentage === 100 ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {completionPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      completionPercentage === 100 
                        ? 'bg-green-500' 
                        : completionPercentage > 50 
                          ? 'bg-blue-500' 
                          : 'bg-amber-500'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput
                value={tags}
                onChange={onTagsChange}
                placeholder="Add tags..."
              />
            </CardContent>
          </Card>

          {/* Data Summary Card */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle 
                className="text-base cursor-pointer flex items-center justify-between"
                onClick={() => setShowDataSummary(!showDataSummary)}
              >
                <span>Data Summary</span>
                <Badge variant="secondary" className="text-xs">
                  {showDataSummary ? 'Hide' : 'Show'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showDataSummary ? renderDataSummary() : (
                <p className="text-sm text-gray-500">
                  Click "Show" to see a summary of entered data
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="border-gray-200">
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button 
                onClick={onSave} 
                disabled={isSaving}
                className="w-full gap-2"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Card
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onBack}
                disabled={isSaving}
                className="w-full"
              >
                Back to Edit
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
