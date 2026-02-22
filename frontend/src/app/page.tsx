'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { BoardList } from '@/components/BoardList'
import { CreateBoardModal } from '@/components/CreateBoardModal'
import { api } from '@/lib/api'

interface Board {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchBoards = async () => {
    try {
      const data = await api.getBoards()
      setBoards(data.boards)
    } catch (err) {
      console.error('Failed to fetch boards:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBoards()
  }, [])

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Boards</h1>
            <p className="mt-1 text-sm text-gray-400">Manage your document boards</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            New Board
          </button>
        </header>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : (
          <BoardList boards={boards} />
        )}
      </div>

      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBoards}
      />
    </main>
  )
}
