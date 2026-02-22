'use client'

import { Key, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from './CodeBlock'

export function ApiKeySection() {
  const [copied, setCopied] = useState(false)
  const exampleKey = 'dk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exampleKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const curlExample = `curl -X GET "https://api.dockerclaw.io/api/cards" \\
  -H "X-API-Key: ${exampleKey}" \\
  -H "Content-Type: application/json"`

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
            1
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Login</h4>
            <p className="text-sm text-blue-700 mt-1">Sign in to your DockerClaw account</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
            2
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Settings</h4>
            <p className="text-sm text-blue-700 mt-1">Navigate to Settings → API Keys</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
            3
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Generate Key</h4>
            <p className="text-sm text-blue-700 mt-1">Create a new API key and save it securely</p>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-900">X-API-Key Header</h4>
            <p className="text-sm text-amber-700 mt-1">
              All API requests must include your API key in the{' '}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-800">
                X-API-Key
              </code>{' '}
              header.
            </p>
          </div>
        </div>
      </div>

      {/* Example Key */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Example API Key Format</span>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
          </Button>
        </div>
        <code className="block bg-gray-100 p-3 rounded-lg font-mono text-sm text-gray-700 break-all">
          {exampleKey}
        </code>
      </div>

      {/* cURL Example */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Example Request</h4>
        <CodeBlock code={curlExample} language="bash" />
      </div>
    </div>
  )
}
