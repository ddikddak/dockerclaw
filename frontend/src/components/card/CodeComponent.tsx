'use client'

interface CodeComponentProps {
  data: {
    content?: string
    language?: string
  }
}

export function CodeComponent({ data }: CodeComponentProps) {
  const code = data?.content || ''
  const language = data?.language || 'typescript'

  if (!code) {
    return <span className="text-gray-400 italic">No code</span>
  }

  return (
    <div className="bg-gray-900 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400">{language}</span>
      </div>
      <pre className="p-3 text-xs text-gray-100 overflow-x-auto">
        <code>{code.slice(0, 200)}{code.length > 200 && '...'}</code>
      </pre>
    </div>
  )
}
