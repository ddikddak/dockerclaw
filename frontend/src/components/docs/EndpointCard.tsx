'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CodeBlock } from './CodeBlock'
import { cn } from '@/lib/utils'

interface EndpointCardProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  title: string
  description: string
  headers?: { name: string; value: string; required?: boolean }[]
  requestBody?: {
    description?: string
    example: string
  }
  responseBody?: {
    description?: string
    example: string
  }
  defaultOpen?: boolean
}

const methodColors = {
  GET: 'bg-blue-500 hover:bg-blue-600',
  POST: 'bg-green-500 hover:bg-green-600',
  PATCH: 'bg-orange-500 hover:bg-orange-600',
  DELETE: 'bg-red-500 hover:bg-red-600',
}

const methodBgColors = {
  GET: 'bg-blue-50 border-blue-200',
  POST: 'bg-green-50 border-green-200',
  PATCH: 'bg-orange-50 border-orange-200',
  DELETE: 'bg-red-50 border-red-200',
}

export function EndpointCard({
  method,
  path,
  title,
  description,
  headers = [],
  requestBody,
  responseBody,
  defaultOpen = false,
}: EndpointCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={cn('overflow-hidden border-2', methodBgColors[method])}>
      <CardHeader className="p-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-4 p-4 hover:bg-black/5 transition-colors text-left"
        >
          <Badge className={cn('text-white font-mono font-bold px-3 py-1', methodColors[method])}>
            {method}
          </Badge>
          <div className="flex-1 min-w-0">
            <code className="text-sm font-mono text-gray-700 truncate block">{path}</code>
            <p className="text-sm text-gray-500 mt-0.5">{title}</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 px-4 pb-4 space-y-6">
          <Separator />

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          {/* Headers */}
          {headers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Headers</h4>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Value</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {headers.map((header, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 font-mono text-gray-900">{header.name}</td>
                        <td className="px-4 py-2 font-mono text-gray-600">{header.value}</td>
                        <td className="px-4 py-2">
                          {header.required !== false ? (
                            <span className="text-red-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request Body */}
          {requestBody && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Body</h4>
              {requestBody.description && (
                <p className="text-sm text-gray-600 mb-2">{requestBody.description}</p>
              )}
              <CodeBlock code={requestBody.example} language="json" />
            </div>
          )}

          {/* Response Body */}
          {responseBody && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Response Body</h4>
              {responseBody.description && (
                <p className="text-sm text-gray-600 mb-2">{responseBody.description}</p>
              )}
              <CodeBlock code={responseBody.example} language="json" />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
