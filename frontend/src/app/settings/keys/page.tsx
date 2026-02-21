'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, Key } from 'lucide-react'

export default function ApiKeysPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Information for agent authentication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Agent API Keys</CardTitle>
              <CardDescription>
                API keys are used by agents to authenticate with the backend.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Frontend Connected Directly</p>
              <p className="text-sm text-blue-700">
                The frontend connects directly to Supabase and does not require API keys.
                API keys are only needed for external agents connecting via the REST API.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">For Agents</h3>
            <p className="text-sm text-muted-foreground">
              Agents (automated systems) need API keys to create cards and interact with the system.
              To create an API key for an agent, use the backend API directly:
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              POST /api/keys/bootstrap
              Body: {"name": "My Agent"}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Current Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant="default">Connected</Badge>
              <span className="text-sm text-muted-foreground">
                Frontend connected to Supabase directly
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}