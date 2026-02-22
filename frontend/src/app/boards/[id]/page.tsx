'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { DocumentList } from '@/components/DocumentList'
import { api } from '@/lib/api'

interface Board {
  id: string
  name: string
  description: string | null
  document_count: number
  created_at: string
}

interface Document {
  id: string
  title: string
  author: string
  created_at: string
  preview: string
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchData = async () => {
    try {
      const [boardData, docsData] = await Promise.all([
        api.getBoard(params.id),
        api.getDocuments(params.id)
      ])
      setBoard(boardData)
      setDocuments(docsData.documents)
    } catch (err) {
      console.error('Failed to fetch board:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id])

  const handleCopyApiKey = () => {
    // Note: We don't have the API key in this response, would need to fetch separately
    // For now, show a message
    alert('API key is shown only when creating the board. Check your records.')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="py-16 text-center text-gray-400">Loading...</div>
        </div>
      </main>
    )
  }

  if (!board) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="py-16 text-center text-gray-400">Board not found</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to boards
        </Link>

        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{board.name}</h1>
              {board.description && (
                <p className="mt-1 text-sm text-gray-400">{board.description}</p>
              )}
            </div>
            <button
              onClick={handleCopyApiKey}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Copy size={14} />
              API Key
            </button>
          </div>
        </header>

        <section>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Documents ({board.document_count})
          </h2>
          <DocumentList documents={documents} boardId={params.id} />
        </section>
      </div>
    </main>
  )
}
