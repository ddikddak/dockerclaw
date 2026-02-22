'use client'

import ReactMarkdown from 'react-markdown'

interface Document {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  updated_at: string
}

interface DocumentViewerProps {
  document: Document
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const date = new Date(document.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <article className="py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {document.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <span>{document.author}</span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </header>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="text-xl font-semibold mt-8 mb-4 text-gray-900">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mt-6 mb-3 text-gray-900">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mt-5 mb-2 text-gray-900">{children}</h3>,
            p: ({ children }) => <p className="my-4 leading-relaxed text-gray-700">{children}</p>,
            ul: ({ children }) => <ul className="my-4 pl-5 list-disc text-gray-700">{children}</ul>,
            ol: ({ children }) => <ol className="my-4 pl-5 list-decimal text-gray-700">{children}</ol>,
            li: ({ children }) => <li className="my-1">{children}</li>,
            code: ({ children }) => (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono text-gray-800">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-gray-200 pl-4 my-4 text-gray-600 italic">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a href={href} className="text-gray-900 underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {document.content}
        </ReactMarkdown>
      </div>
    </article>
  )
}
