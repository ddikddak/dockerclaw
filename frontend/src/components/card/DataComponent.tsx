'use client'

import { useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { Button } from '@/components/ui/button'
import { Copy, Check, Database } from 'lucide-react'

interface DataComponentProps {
  data: {
    json?: object | string
  }
  cardId?: string
  componentId?: string
  editable?: boolean
}

function parseJson(jsonData: object | string | undefined): object {
  if (!jsonData) return {}
  if (typeof jsonData === 'string') {
    try {
      return JSON.parse(jsonData)
    } catch {
      return { error: 'Invalid JSON string', value: jsonData }
    }
  }
  return jsonData
}

export function DataComponent({
  data,
  cardId,
  componentId = 'data',
  editable = false,
}: DataComponentProps) {
  const [copied, setCopied] = useState(false)
  const [expandAll, setExpandAll] = useState(false)

  const parsedData = parseJson(data?.json)
  const hasData = Object.keys(parsedData).length > 0

  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(parsedData, null, 2)
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!hasData) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-2">
        <Database className="h-4 w-4" />
        <span className="text-sm italic">No data</span>
      </div>
    )
  }

  // Custom styles for react-json-view-lite
  const customStyles = {
    ...defaultStyles,
    container: 'json-view-lite-container',
    basicChildStyle: 'json-view-lite-child',
    label: 'json-view-lite-label text-purple-600 font-medium',
    value: 'json-view-lite-value',
    stringValue: 'json-view-lite-string text-green-600',
    numberValue: 'json-view-lite-number text-blue-600',
    booleanValue: 'json-view-lite-boolean text-orange-600',
    nullValue: 'json-view-lite-null text-gray-500',
    undefinedValue: 'json-view-lite-undefined text-gray-500',
  }

  return (
    <div className="rounded-lg border bg-gray-50 overflow-hidden">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">JSON Data</span>
          <span className="text-xs text-gray-400">
            ({Object.keys(parsedData).length} keys)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? 'Collapse' : 'Expand'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
            title="Copy JSON"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* JSON Tree View */}
      <div className="p-3 overflow-auto max-h-[300px]">
        <JsonView
          data={parsedData}
          shouldExpandNode={expandAll ? allExpanded : () => false}
          style={customStyles}
        />
      </div>
    </div>
  )
}
