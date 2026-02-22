'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { FileText, Plus, LayoutTemplate } from 'lucide-react'

interface TemplateEmptyStateProps {
  variant?: 'no-templates' | 'no-results' | 'error'
  onCreate?: () => void
  onClear?: () => void
  onRetry?: () => void
}

export function TemplateEmptyState({ 
  variant = 'no-templates',
  onCreate,
  onClear,
  onRetry
}: TemplateEmptyStateProps) {
  const variants = {
    'no-templates': {
      icon: LayoutTemplate,
      title: 'No templates yet',
      description: 'Create your first template to define reusable card structures with components like text, checklists, and images.',
      action: onCreate ? {
        label: 'Create Template',
        href: '/templates/new'
      } : undefined
    },
    'no-results': {
      icon: FileText,
      title: 'No templates found',
      description: 'We couldn\'t find any templates matching your search. Try adjusting your filters.',
      action: onClear ? {
        label: 'Clear filters',
        onClick: onClear
      } : undefined
    },
    'error': {
      icon: FileText,
      title: 'Failed to load templates',
      description: 'Something went wrong while loading your templates. Please try again.',
      action: onRetry ? {
        label: 'Try again',
        onClick: onRetry
      } : undefined
    }
  }

  const config = variants[variant]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Icon/Illustration */}
      <div className="relative mb-8">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
            variant === 'error' 
              ? 'bg-gradient-to-br from-red-100 to-orange-100' 
              : 'bg-gradient-to-br from-purple-100 to-blue-100'
          }`}
        >
          <Icon className={`w-12 h-12 ${
            variant === 'error' ? 'text-red-500' : 'text-purple-500'
          }`} />
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-purple-200 rounded-lg opacity-60"
        />
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-200 rounded-full opacity-60"
        />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {config.title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-sm mb-8">
        {config.description}
      </p>

      {/* CTA Button */}
      {config.action && (
        <>
          {'href' in config.action ? (
            <Link href={config.action.href}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                {config.action.label}
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              onClick={config.action.onClick}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              {config.action.label}
            </Button>
          )}
        </>
      )}
    </motion.div>
  )
}
