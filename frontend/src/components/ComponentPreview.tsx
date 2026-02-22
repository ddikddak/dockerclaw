'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TemplateComponent } from '@/types/template'
import { 
  Type, 
  CheckSquare, 
  Image as ImageIcon, 
  Code2,
  Upload,
  FileCode
} from 'lucide-react'

interface ComponentPreviewProps {
  components: TemplateComponent[]
}

const componentIcons: Record<string, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  checklist: <CheckSquare className="w-4 h-4" />,
  image: <ImageIcon className="w-4 h-4" />,
  code: <Code2 className="w-4 h-4" />,
}

function PreviewField({ component }: { component: TemplateComponent }) {
  const { type, label, required, placeholder, multiline, language, maxFiles } = component

  switch (type) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {multiline ? (
            <Textarea
              placeholder={placeholder || 'Enter text...'}
              className="min-h-[100px] resize-none"
              disabled
            />
          ) : (
            <Input
              placeholder={placeholder || 'Enter text...'}
              disabled
            />
          )}
        </div>
      )

    case 'checklist':
      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox disabled id={`preview-check-${component.id}-${i}`} />
                <Label 
                  htmlFor={`preview-check-${component.id}-${i}`}
                  className="text-sm font-normal text-gray-600"
                >
                  {placeholder || `Item ${i}`}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )

    case 'image':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Click or drag images here
            </p>
            <p className="text-xs text-gray-400">
              Max {maxFiles || 1} file{maxFiles !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )

    case 'code':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {language && (
              <Badge variant="secondary" className="text-xs">
                <FileCode className="w-3 h-3 mr-1" />
                {language}
              </Badge>
            )}
          </div>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 min-h-[120px]">
            <pre className="text-gray-500">
              {placeholder || `// Enter ${language || 'code'} here...`}
            </pre>
          </div>
        </div>
      )

    default:
      return null
  }
}

export function ComponentPreview({ components }: ComponentPreviewProps) {
  if (components.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <FileCode className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Preview
        </h3>
        <p className="text-gray-500 max-w-xs">
          Add components to see how your template will look when creating cards.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-500">
          Preview ({components.length} component{components.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="space-y-6">
        {components.map((component) => (
          <div key={component.id} className="relative">
            <PreviewField component={component} />
          </div>
        ))}
      </div>
    </div>
  )
}
