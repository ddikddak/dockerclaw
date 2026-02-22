'use client'

import { DocumentItem } from './DocumentItem'

interface Document {
  id: string
  title: string
  author: string
  created_at: string
  preview: string
}

interface DocumentListProps {
  documents: Document[]
  boardId: string
}

export function DocumentList({ documents, boardId }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No documents yet.</p>
        <p className="text-sm mt-1">Use the API to add documents to this board.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {documents.map(doc => (
        <DocumentItem key={doc.id} document={doc} boardId={boardId} />
      ))}
    </div>
  )
}
