'use client'

import { BoardCard } from './BoardCard'

interface Board {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
}

interface BoardListProps {
  boards: Board[]
}

export function BoardList({ boards }: BoardListProps) {
  if (boards.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No boards yet. Create your first board to get started.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {boards.map(board => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  )
}
