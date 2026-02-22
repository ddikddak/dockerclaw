'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

export function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full min-h-[500px] px-4"
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
          <FileText className="w-12 h-12 text-blue-500" />
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
        No cards yet
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-sm mb-8">
        Get started by creating your first card. You can add text, images, code snippets, and more.
      </p>

      {/* CTA Button */}
      <Link href="/cards/new">
        <Button 
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create your first card
        </Button>
      </Link>

      {/* Helper text */}
      <p className="text-xs text-gray-400 mt-6">
        Or use a template to get started faster
      </p>
    </motion.div>
  )
}
