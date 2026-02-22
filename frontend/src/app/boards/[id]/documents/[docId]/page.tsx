'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DocumentViewer } from '@/components/DocumentViewer'
import { api } from '@/lib/api'

interface Document {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
}

export default function DocumentPage({ params }: { params: { id: string; docId: string } }) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const data = await api.getDocument(params.id, params.docId)
        setDoc(data)
      } catch (err) {
        console.error('Failed to fetch document:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocument()
  }, [params.id, params.docId])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="py-16 text-center text-gray-400">Loading...</div>
        </div>
      </main>
    )
  }

  if (!doc) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="py-16 text-center text-gray-400">Document not found</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href={`/boards/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to board
        </Link>

        <DocumentViewer document={doc} />
      </div>
    </main>
  )
}
