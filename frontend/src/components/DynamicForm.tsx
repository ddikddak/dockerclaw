'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ImageComponent } from '@/components/card/ImageComponent'
import { CodeComponent } from '@/components/card/CodeComponent'
import type { TemplateComponent } from '@/types/template'
import { X, Plus, Upload, FileCode } from 'lucide-react'

interface ChecklistItem {
  text: string
  checked: boolean
}

interface DynamicFormProps {
  components: TemplateComponent[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  readOnly?: boolean
}

export function DynamicForm({ 
  components, 
  values, 
  onChange, 
  readOnly = false 
}: DynamicFormProps) {
  const [uploadingComponent, setUploadingComponent] = useState<string | null>(null)

  const updateValue = useCallback((componentId: string, value: any) => {
    onChange({ ...values, [componentId]: value })
  }, [values, onChange])

  const handleTextChange = (component: TemplateComponent, value: string) => {
    updateValue(component.id, value)
  }

  const handleChecklistAdd = (component: TemplateComponent) => {
    const currentItems: ChecklistItem[] = (values[component.id] as ChecklistItem[]) || []
    updateValue(component.id, [...currentItems, { text: '', checked: false }])
  }

  const handleChecklistRemove = (component: TemplateComponent, index: number) => {
    const currentItems: ChecklistItem[] = (values[component.id] as ChecklistItem[]) || []
    updateValue(component.id, currentItems.filter((_, i) => i !== index))
  }

  const handleChecklistTextChange = (component: TemplateComponent, index: number, text: string) => {
    const currentItems: ChecklistItem[] = (values[component.id] as ChecklistItem[]) || []
    const newItems = [...currentItems]
    newItems[index] = { ...newItems[index], text }
    updateValue(component.id, newItems)
  }

  const handleChecklistToggle = (component: TemplateComponent, index: number, checked: boolean) => {
    const currentItems: ChecklistItem[] = (values[component.id] as ChecklistItem[]) || []
    const newItems = [...currentItems]
    newItems[index] = { ...newItems[index], checked }
    updateValue(component.id, newItems)
  }

  const handleImageUpload = async (component: TemplateComponent, file: File) => {
    // Per ara, fem upload a una URL temporal
    // En producció, això hauria de pujar al backend
    setUploadingComponent(component.id)
    
    try {
      // Crear object URL temporal
      const objectUrl = URL.createObjectURL(file)
      updateValue(component.id, {
        url: objectUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        // Mark as temporary for backend processing
        _tempFile: file
      })
    } finally {
      setUploadingComponent(null)
    }
  }

  const handleCodeChange = async (component: TemplateComponent, code: string) => {
    updateValue(component.id, {
      content: code,
      language: component.language || 'typescript'
    })
  }

  const renderComponent = (component: TemplateComponent) => {
    const value = values[component.id]
    const isRequired = component.required
    const hasValue = value !== undefined && value !== null && value !== ''
    const isValid = !isRequired || hasValue

    switch (component.type) {
      case 'text':
        return renderTextComponent(component, value, isValid)
      case 'checklist':
        return renderChecklistComponent(component, value, isValid)
      case 'image':
        return renderImageComponent(component, value)
      case 'code':
        return renderCodeComponent(component, value)
      default:
        return null
    }
  }

  const renderTextComponent = (component: TemplateComponent, value: any, isValid: boolean) => {
    const textValue = typeof value === 'string' ? value : ''
    
    if (readOnly) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
          </div>
          <div className={`p-3 rounded-md bg-gray-50 border ${!isValid ? 'border-red-200' : 'border-gray-200'}`}>
            {textValue ? (
              component.multiline ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{textValue}</p>
              ) : (
                <p className="text-sm text-gray-800">{textValue}</p>
              )
            ) : (
              <span className="text-sm text-gray-400 italic">No value provided</span>
            )}
          </div>
        </div>
      )
    }

    if (component.multiline) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={component.id} className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
            {!isValid && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          <Textarea
            id={component.id}
            value={textValue}
            onChange={(e) => handleTextChange(component, e.target.value)}
            placeholder={component.placeholder || `Enter ${component.label.toLowerCase()}...`}
            className={`min-h-[100px] resize-none ${!isValid ? 'border-red-300 focus:border-red-500' : ''}`}
          />
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={component.id} className="text-sm font-medium text-gray-700">
            {component.label}
          </Label>
          {component.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
          {!isValid && (
            <Badge variant="destructive" className="text-xs">Required</Badge>
          )}
        </div>
        <Input
          id={component.id}
          type="text"
          value={textValue}
          onChange={(e) => handleTextChange(component, e.target.value)}
          placeholder={component.placeholder || `Enter ${component.label.toLowerCase()}...`}
          className={!isValid ? 'border-red-300 focus:border-red-500' : ''}
        />
      </div>
    )
  }

  const renderChecklistComponent = (component: TemplateComponent, value: any, isValid: boolean) => {
    const items: ChecklistItem[] = Array.isArray(value) ? value : []
    
    if (readOnly) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
          </div>
          <div className={`p-3 rounded-md bg-gray-50 border ${!isValid ? 'border-red-200' : 'border-gray-200'}`}>
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Checkbox checked={item.checked} disabled className="h-4 w-4" />
                    <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.text || <span className="italic text-gray-400">Empty item</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-400 italic">No items</span>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
            {!isValid && items.length === 0 && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleChecklistAdd(component)}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        </div>
        
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={index} className="border-gray-200">
              <CardContent className="p-2 flex items-center gap-2">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => handleChecklistToggle(component, index, checked as boolean)}
                  className="h-4 w-4"
                />
                <Input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleChecklistTextChange(component, index, e.target.value)}
                  placeholder="Item text..."
                  className="flex-1 h-8 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChecklistRemove(component, index)}
                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-400">No items yet</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleChecklistAdd(component)}
                className="mt-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add first item
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderImageComponent = (component: TemplateComponent, value: any) => {
    const imageData = typeof value === 'object' ? value : { url: value }
    
    if (readOnly) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
          </div>
          <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
            {imageData?.url ? (
              <ImageComponent
                data={imageData}
                editable={false}
              />
            ) : (
              <div className="flex items-center gap-2 text-gray-400 py-4">
                <Upload className="h-5 w-5" />
                <span className="text-sm italic">No image uploaded</span>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-gray-700">
            {component.label}
          </Label>
          {component.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </div>
        <ImageComponent
          data={imageData}
          editable={true}
          onUpload={(file) => handleImageUpload(component, file)}
        />
        {uploadingComponent === component.id && (
          <p className="text-xs text-blue-500">Uploading...</p>
        )}
      </div>
    )
  }

  const renderCodeComponent = (component: TemplateComponent, value: any) => {
    const codeData = typeof value === 'object' 
      ? value 
      : { content: value, language: component.language || 'typescript' }
    
    if (readOnly) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">
              {component.label}
            </Label>
            {component.required && (
              <span className="text-red-500 text-xs">*</span>
            )}
          </div>
          <CodeComponent
            data={codeData}
            editable={false}
          />
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-gray-700">
            {component.label}
          </Label>
          {component.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
          {component.language && (
            <Badge variant="secondary" className="text-xs">
              <FileCode className="h-3 w-3 mr-1" />
              {component.language}
            </Badge>
          )}
        </div>
        <CodeComponent
          data={codeData}
          editable={true}
          onSave={(code) => handleCodeChange(component, code)}
        />
      </div>
    )
  }

  // Validació del formulari
  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    for (const component of components) {
      if (component.required) {
        const value = values[component.id]
        let hasValue = false
        
        if (component.type === 'checklist') {
          hasValue = Array.isArray(value) && value.length > 0
        } else if (component.type === 'image' || component.type === 'code') {
          hasValue = typeof value === 'object' 
            ? value?.url || value?.content 
            : !!value
        } else {
          hasValue = !!value && String(value).trim() !== ''
        }
        
        if (!hasValue) {
          errors.push(`${component.label} is required`)
        }
      }
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Exposar la funció de validació
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _validation = validateForm()

  if (components.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No components defined in this template</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {components.map((component) => (
        <div key={component.id}>
          {renderComponent(component)}
        </div>
      ))}
    </div>
  )
}

// Export validation helper
export function validateDynamicForm(
  components: TemplateComponent[], 
  values: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const component of components) {
    if (component.required) {
      const value = values[component.id]
      let hasValue = false
      
      if (component.type === 'checklist') {
        hasValue = Array.isArray(value) && value.length > 0
      } else if (component.type === 'image' || component.type === 'code') {
        hasValue = typeof value === 'object' 
          ? value?.url || value?.content 
          : !!value
      } else {
        hasValue = !!value && String(value).trim() !== ''
      }
      
      if (!hasValue) {
        errors.push(`${component.label} is required`)
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}
