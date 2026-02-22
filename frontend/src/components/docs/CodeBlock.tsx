'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language: 'bash' | 'python' | 'javascript' | 'json' | 'go'
  showLineNumbers?: boolean
  className?: string
}

const languageLabels: Record<string, string> = {
  bash: 'Bash',
  python: 'Python',
  javascript: 'JavaScript',
  json: 'JSON',
  go: 'Go',
}

export function CodeBlock({ code, language, showLineNumbers = false, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.trim().split('\n')

  const getLanguageColor = () => {
    switch (language) {
      case 'bash':
        return 'bg-gray-100 text-gray-800'
      case 'python':
        return 'bg-blue-100 text-blue-800'
      case 'javascript':
        return 'bg-yellow-100 text-yellow-800'
      case 'json':
        return 'bg-green-100 text-green-800'
      case 'go':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={cn('relative group rounded-lg overflow-hidden border border-gray-200', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className={cn('text-xs font-medium px-2 py-1 rounded', getLanguageColor())}>
          {languageLabels[language]}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2 text-gray-500 hover:text-gray-700"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              <span className="text-xs">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="relative bg-gray-900 overflow-x-auto">
        <pre className="p-4 text-sm font-mono text-gray-100">
          <code>
            {showLineNumbers ? (
              <div className="flex">
                <div className="select-none pr-4 text-gray-500 text-right min-w-[3rem]">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1">
                  {lines.map((line, i) => (
                    <div key={i}>{line || ' '}</div>
                  ))}
                </div>
              </div>
            ) : (
              code.trim()
            )}
          </code>
        </pre>
      </div>
    </div>
  )
}
