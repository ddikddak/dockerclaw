'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Type, 
  CheckSquare, 
  Image as ImageIcon, 
  Code2,
  FileText
} from 'lucide-react'
import { Template } from '@/types/template'

interface TemplateCardProps {
  template: Template
  onClick?: () => void
}

const componentIcons: Record<string, React.ReactNode> = {
  text: <Type className="w-3 h-3" />,
  checklist: <CheckSquare className="w-3 h-3" />,
  image: <ImageIcon className="w-3 h-3" />,
  code: <Code2 className="w-3 h-3" />,
}

const componentLabels: Record<string, string> = {
  text: 'Text',
  checklist: 'Checklist',
  image: 'Image',
  code: 'Code',
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const uniqueTypes = [...new Set(template.components.map(c => c.type))]

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-gray-200 bg-white"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {template.components.length} component{template.components.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {uniqueTypes.map((type) => (
              <div 
                key={type}
                className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center"
                title={componentLabels[type]}
              >
                <span className="text-gray-600">
                  {componentIcons[type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
