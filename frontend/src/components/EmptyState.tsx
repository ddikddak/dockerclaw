'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center h-full min-h-[400px] px-4 ${className}`}
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
          className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center"
        >
          <Icon className="w-12 h-12 text-blue-500" />
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
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-sm mb-8">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          <Button
            size="lg"
            onClick={action.onClick}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            {action.icon && <action.icon className="w-5 h-5 mr-2" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="ghost"
            size="lg"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// Variants predefinides per diferents contexts
export function NoCardsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No cards yet"
      description="Get started by creating your first card. You can add text, images, code snippets, and more."
      action={{
        label: "Create your first card",
        onClick: onCreate,
        icon: Plus
      }}
      secondaryAction={{
        label: "Browse templates",
        onClick: () => window.location.href = '/templates'
      }}
    />
  )
}

export function NoTemplatesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={LayoutTemplate}
      title="No templates yet"
      description="Create your first template to define reusable card structures with components like text, checklists, and images."
      action={{
        label: "Create Template",
        onClick: onCreate,
        icon: Plus
      }}
    />
  )
}

export function NoSearchResultsEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="We couldn't find any cards matching your search. Try adjusting your filters or search terms."
      action={{
        label: "Clear filters",
        onClick: onClear,
        icon: X
      }}
    />
  )
}

export function NoArchivedCardsEmptyState() {
  return (
    <EmptyState
      icon={Archive}
      title="No archived cards"
      description="Archived cards will appear here. You can archive cards from the dashboard."
    />
  )
}

// Imports necessaris per les variants
import { FileText, Plus, LayoutTemplate, Search, X, Archive } from 'lucide-react'
