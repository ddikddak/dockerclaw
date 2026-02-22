'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TemplateComponent } from '@/types/template'
import { 
  GripVertical, 
  Trash2, 
  Type, 
  CheckSquare, 
  Image as ImageIcon, 
  Code2,
  Plus
} from 'lucide-react'

interface SortableComponentItemProps {
  component: TemplateComponent
  onUpdate: (id: string, updates: Partial<TemplateComponent>) => void
  onDelete: (id: string) => void
}

function SortableComponentItem({ component, onUpdate, onDelete }: SortableComponentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: component.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const componentIcons: Record<string, React.ReactNode> = {
    text: <Type className="w-4 h-4" />,
    checklist: <CheckSquare className="w-4 h-4" />,
    image: <ImageIcon className="w-4 h-4" />,
    code: <Code2 className="w-4 h-4" />,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg shadow-sm"
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          
          <div className="flex-1">
            <Select
              value={component.type}
              onValueChange={(value: TemplateComponent['type']) => 
                onUpdate(component.id, { type: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <span className="flex items-center gap-2">
                    <Type className="w-4 h-4" /> Text
                  </span>
                </SelectItem>
                <SelectItem value="checklist">
                  <span className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> Checklist
                  </span>
                </SelectItem>
                <SelectItem value="image">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Image
                  </span>
                </SelectItem>
                <SelectItem value="code">
                  <span className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" /> Code
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => onDelete(component.id)}
            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`label-${component.id}`}>Label</Label>
          <Input
            id={`label-${component.id}`}
            value={component.label}
            onChange={(e) => onUpdate(component.id, { label: e.target.value })}
            placeholder="Enter component label"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`required-${component.id}`}
            checked={component.required || false}
            onCheckedChange={(checked) => 
              onUpdate(component.id, { required: checked as boolean })
            }
          />
          <Label htmlFor={`required-${component.id}`} className="text-sm font-normal">
            Required field
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`placeholder-${component.id}`}>Placeholder (optional)</Label>
          <Input
            id={`placeholder-${component.id}`}
            value={component.placeholder || ''}
            onChange={(e) => onUpdate(component.id, { placeholder: e.target.value })}
            placeholder="Enter placeholder text"
          />
        </div>

        {/* Type-specific options */}
        {component.type === 'text' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`multiline-${component.id}`}
              checked={component.multiline || false}
              onCheckedChange={(checked) => 
                onUpdate(component.id, { multiline: checked as boolean })
              }
            />
            <Label htmlFor={`multiline-${component.id}`} className="text-sm font-normal">
              Multiline text area
            </Label>
          </div>
        )}

        {component.type === 'code' && (
          <div className="space-y-2">
            <Label htmlFor={`language-${component.id}`}>Language</Label>
            <Select
              value={component.language || 'javascript'}
              onValueChange={(value) => onUpdate(component.id, { language: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="bash">Bash</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {component.type === 'image' && (
          <div className="space-y-2">
            <Label htmlFor={`maxFiles-${component.id}`}>Max files</Label>
            <Input
              id={`maxFiles-${component.id}`}
              type="number"
              min={1}
              max={10}
              value={component.maxFiles || 1}
              onChange={(e) => onUpdate(component.id, { maxFiles: parseInt(e.target.value) || 1 })}
            />
          </div>
        )}
      </CardContent>
    </div>
  )
}

interface ComponentBuilderProps {
  components: TemplateComponent[]
  onChange: (components: TemplateComponent[]) => void
}

export function ComponentBuilder({ components, onChange }: ComponentBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = components.findIndex((c) => c.id === active.id)
      const newIndex = components.findIndex((c) => c.id === over.id)
      onChange(arrayMove(components, oldIndex, newIndex))
    }
  }, [components, onChange])

  const handleAddComponent = useCallback(() => {
    const newComponent: TemplateComponent = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'New Component',
      required: false,
    }
    onChange([...components, newComponent])
  }, [components, onChange])

  const handleUpdateComponent = useCallback((id: string, updates: Partial<TemplateComponent>) => {
    onChange(
      components.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }, [components, onChange])

  const handleDeleteComponent = useCallback((id: string) => {
    onChange(components.filter((c) => c.id !== id))
  }, [components, onChange])

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={components.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {components.map((component) => (
              <SortableComponentItem
                key={component.id}
                component={component}
                onUpdate={handleUpdateComponent}
                onDelete={handleDeleteComponent}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {components.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">No components yet</p>
          <Button onClick={handleAddComponent} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add your first component
          </Button>
        </div>
      )}

      {components.length > 0 && (
        <Button 
          onClick={handleAddComponent} 
          variant="outline" 
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Component
        </Button>
      )}
    </div>
  )
}
