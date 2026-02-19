'use client'

interface TextComponentProps {
  data: {
    description?: string
    content?: string
  }
}

export function TextComponent({ data }: TextComponentProps) {
  const content = data?.description || data?.content || ''
  
  if (!content) {
    return <span className="text-gray-400 italic">No content</span>
  }

  return (
    <div className="line-clamp-3 text-gray-600">
      {content}
    </div>
  )
}
