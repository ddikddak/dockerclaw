'use client'

import { Template } from '@/types/template'

interface TemplateCardProps {
  template: Template
  onClick?: () => void
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const componentCount = template.components?.length || 0

  return (
    <div
      onClick={onClick}
      className="bg-white p-5 cursor-pointer border border-transparent hover:border-gray-200 transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className="text-gray-500"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <path d="M9 3v18"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {componentCount} component{componentCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}