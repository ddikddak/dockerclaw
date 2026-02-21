'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApiKey } from '@/hooks/useApiKey'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Copy, Key, Plus, Trash2, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ApiKeyItem {
  id: string
  name: string
  keyPrefix: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const router = useRouter()
  const { apiKey: storedApiKey, setApiKey: setStoredApiKey } = useApiKey()
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyFull, setNewKeyFull] = useState('')
  const [copied, setCopied] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  // Carregar les keys existents
  const fetchKeys = async () => {
    try {
      const data = await api.getApiKeys()
      setKeys(data.keys || [])
    } catch (error) {
      console.error('Error fetching keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (storedApiKey) {
      fetchKeys()
    } else {
      setIsLoading(false)
    }
  }, [storedApiKey])

  // Crear nova API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    setIsCreating(true)
    try {
      const data = await api.createApiKey(newKeyName.trim())
      
      // Mostrar la nova key (només aquesta vegada!)
      setNewKeyFull(data.fullKey)
      setShowCreateDialog(false)
      setShowNewKeyDialog(true)
      setNewKeyName('')
      
      // Actualitzar la llista
      fetchKeys()
      
      // Si no teníem cap key configurada, configurar aquesta automàticament
      if (!storedApiKey) {
        setStoredApiKey(data.fullKey)
        toast.success('API key created and set as active!')
      } else {
        toast.success('API key created successfully!')
      }
    } catch (error) {
      console.error('Error creating key:', error)
      toast.error('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  // Copiar key al portapapers
  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKeyFull)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('API key copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy API key')
    }
  }

  // Revocar key
  const handleRevokeKey = async () => {
    if (!keyToRevoke) return

    setIsRevoking(true)
    try {
      await api.revokeApiKey(keyToRevoke.id)

      toast.success('API key revoked successfully')
      fetchKeys()
    } catch (error) {
      console.error('Error revoking key:', error)
      toast.error('Failed to revoke API key')
    } finally {
      setIsRevoking(false)
      setShowRevokeDialog(false)
      setKeyToRevoke(null)
    }
  }

  // Formatejar data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys for accessing the DockerClaw API.
        </p>
      </div>

      {!storedApiKey && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div className="flex-1">
              <p className="font-medium">No API Key Configured</p>
              <p className="text-sm text-muted-foreground">
                You need to create and configure an API key to use the application.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                {keys.length} key{keys.length !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet.</p>
              <p className="text-sm">Create your first key to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setKeyToRevoke(key)
                            setShowRevokeDialog(true)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diàleg per crear nova key */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Give your API key a name to help you identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Key Name
            </label>
            <Input
              placeholder="e.g., Production Server, Development, My App"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateKey()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isCreating}>
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Create Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg per mostrar la nova key (NOMÉS AQUESTA VEGADA!) */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your New API Key
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                <strong className="text-amber-500">Important:</strong> This is the <strong>only time</strong> you will see this API key.
              </p>
              <p>Copy it now and store it securely. If you lose it, you'll need to create a new one.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded text-sm break-all font-mono">
                {newKeyFull}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyKey}
                className={copied ? 'text-green-500' : ''}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewKeyDialog(false)}>
              I've Copied My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diàleg per confirmar revocació */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the key <strong>"{keyToRevoke?.name}"</strong>?
              <br /><br />
              This action cannot be undone. Any applications using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevokeKey} 
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
