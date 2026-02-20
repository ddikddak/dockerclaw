'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Reaction } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '🎉', '🚀', '👀', '✅'] as const

interface ReactionsProps {
  reactions: Reaction[]
  cardId: string
  currentUserId?: string
  onToggleReaction?: (emoji: Reaction['emoji']) => Promise<void>
  isLoading?: boolean
}

export function Reactions({
  reactions,
  cardId,
  currentUserId,
  onToggleReaction,
  isLoading = false,
}: ReactionsProps) {
  // Group reactions by emoji and check if current user has reacted
  const groupedReactions = useMemo(() => {
    const groups: Record<string, { count: number; hasReacted: boolean; users: string[] }> = {}

    // Initialize all emojis with 0 count
    EMOJIS.forEach((emoji) => {
      groups[emoji] = { count: 0, hasReacted: false, users: [] }
    })

    // Group reactions
    reactions.forEach((reaction) => {
      if (groups[reaction.emoji]) {
        groups[reaction.emoji].count++
        groups[reaction.emoji].users.push(reaction.author_name || 'Unknown')
        if (currentUserId && reaction.author_id === currentUserId) {
          groups[reaction.emoji].hasReacted = true
        }
      }
    })

    return groups
  }, [reactions, currentUserId])

  const handleToggle = async (emoji: Reaction['emoji']) => {
    if (!onToggleReaction || isLoading) return
    await onToggleReaction(emoji)
  }

  const getTooltipText = (emoji: string, users: string[]) => {
    if (users.length === 0) return emoji
    if (users.length <= 3) return users.join(', ')
    return `${users.slice(0, 3).join(', ')} and ${users.length - 3} more`
  }

  return (
    <div className="flex flex-wrap gap-1">
      {EMOJIS.map((emoji) => {
        const group = groupedReactions[emoji]
        const hasCount = group.count > 0

        return (
          <motion.div
            key={emoji}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={group.hasReacted ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggle(emoji as Reaction['emoji'])}
              disabled={isLoading}
              className={`
                h-7 px-2 gap-1 text-sm transition-all
                ${group.hasReacted 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}
                ${hasCount ? 'font-medium' : 'text-gray-400'}
              `}
              title={getTooltipText(emoji, group.users)}
            >
              <span className="text-base">{emoji}</span>
              {hasCount && (
                <span className={`text-xs ${group.hasReacted ? 'text-white' : 'text-gray-600'}`}>
                  {group.count}
                </span>
              )}
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}

// Compact version for inline display
interface CompactReactionsProps {
  reactions: Reaction[]
  currentUserId?: string
}

export function CompactReactions({ reactions, currentUserId }: CompactReactionsProps) {
  const groupedReactions = useMemo(() => {
    const groups: Record<string, { count: number; hasReacted: boolean }> = {}

    reactions.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, hasReacted: false }
      }
      groups[reaction.emoji].count++
      if (currentUserId && reaction.author_id === currentUserId) {
        groups[reaction.emoji].hasReacted = true
      }
    })

    return groups
  }, [reactions, currentUserId])

  const activeEmojis = Object.entries(groupedReactions).filter(([, group]) => group.count > 0)

  if (activeEmojis.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {activeEmojis.map(([emoji, group]) => (
        <span
          key={emoji}
          className={`
            inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
            ${group.hasReacted 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'}
          `}
        >
          <span>{emoji}</span>
          <span>{group.count}</span>
        </span>
      ))}
    </div>
  )
}
