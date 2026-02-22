'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Search, X, Archive, Trash2, Loader2 } from 'lucide-react'

interface CardEmptyStateProps {
  variant?: 'no-cards' | 'no-results' | 'no-archived' | 'error' | 'loading'
  onCreate?: () => void
  onClear?: () => void
  onRetry?: () => void
  className?: string
}

export function CardEmptyState({ 
  variant = 'no-cards',
  onCreate,
  onClear,
  onRetry,
  className = ''
}: CardEmptyStateProps) {
  // Render variant-specific content
  const renderContent = () => {
    switch (variant) {
      case 'no-cards':
        return {
          icon: FileText,
          title: 'No cards yet',
          description: 'Get started by creating your first card. You can add text, images, code snippets, and more.',
          gradient: 'from-blue-100 to-purple-100',
          iconColor: 'text-blue-500',
          actions: (
            <>
              <Link href="/cards/new">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create your first card
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="ghost" size="lg">
                  Browse templates
                </Button>
              </Link>
            </>
          )
        }
      
      case 'no-results':
        return {
          icon: Search,
          title: 'No results found',
          description: 'We couldn\'t find any cards matching your search. Try adjusting your filters or search terms.',
          gradient: 'from-amber-100 to-orange-100',
          iconColor: 'text-amber-500',
          actions: onClear ? (
            <Button
              size="lg"
              onClick={onClear}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <X className="w-5 h-5 mr-2" />
              Clear filters
            </Button>
          ) : null
        }
      
      case 'no-archived':
        return {
          icon: Archive,
          title: 'No archived cards',
          description: 'Archived cards will appear here. You can archive cards from the dashboard.',
          gradient: 'from-gray-100 to-slate-100',
          iconColor: 'text-gray-500',
          actions: (
            <Link href="/">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                Go to dashboard
              </Button>
            </Link>
          )
        }
      
      case 'error':
        return {
          icon: Trash2,
          title: 'Failed to load cards',
          description: 'Something went wrong while loading your cards. Please try again.',
          gradient: 'from-red-100 to-orange-100',
          iconColor: 'text-red-500',
          actions: onRetry ? (
            <Button
              size="lg"
              onClick={onRetry}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              Try again
            </Button>
          ) : null
        }
      
      case 'loading':
        return {
          icon: Loader2,
          title: 'Loading cards...',
          description: 'Please wait while we fetch your cards.',
          gradient: 'from-blue-100 to-purple-100',
          iconColor: 'text-blue-500',
          actions: null
        }
    }
  }

  const content = renderContent()
  const Icon = content.icon

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
          animate={variant === 'loading' ? { rotate: 360 } : { scale: [1, 1.05, 1] }}
          transition={
            variant === 'loading' 
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
          className={`w-24 h-24 bg-gradient-to-br ${content.gradient} rounded-2xl flex items-center justify-center`}
        >
          <Icon className={`w-12 h-12 ${content.iconColor}`} />
        </motion.div>

        {/* Decorative elements (no loading) */}
        {variant !== 'loading' && (
          <>
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
          </>
        )}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {content.title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-sm mb-8">
        {content.description}
      </p>

      {/* Actions */}
      {content.actions && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {content.actions}
        </div>
      )}
    </motion.div>
  )
}
