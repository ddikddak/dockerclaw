'use client'

import Link from 'next/link'

interface Document {
  id: string
  title: string
  author: string
  created_at: string
  preview: string
}

interface DocumentItemProps {
  document: Document
  boardId: string
}

export function DocumentItem({ document, boardId }: DocumentItemProps) {
  const date = new Date(document.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <Link
      href={`/boards/${boardId}/documents/${document.id}`}
      className="block py-5 px-2 hover:bg-gray-50 transition-colors duration-150 group"
    >
      <h3 className="text-base font-medium text-gray-900 group-hover:text-gray-700">
        {document.title}
      </h3>
      <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
        {document.preview}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <span>{document.author}</span>
        <span>·</span>
        <span>{date}</span>
      </div>
    </Link>
  )
}
