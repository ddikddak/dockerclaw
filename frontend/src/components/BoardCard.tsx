'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'

interface Board {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
}

interface BoardCardProps {
  board: Board
}

export function BoardCard({ board }: BoardCardProps) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="block py-5 px-2 hover:bg-gray-50 transition-colors duration-150 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 group-hover:text-gray-700">
            {board.name}
          </h3>
          {board.description && (
            <p className="mt-1 text-sm text-gray-400 truncate">
              {board.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 text-sm ml-4">
          <FileText size={14} />
          <span>{board.document_count}</span>
        </div>
      </div>
    </Link>
  )
}
