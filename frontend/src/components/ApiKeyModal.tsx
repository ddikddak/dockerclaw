'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Plus, Copy, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useApiKey } from '@/hooks/useApiKey'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onKeyConfigured?: () => void
}

export function ApiKeyModal({ isOpen, onClose, onKeyConfigured }: ApiKeyModalProps) {
  const router = useRouter()
  const { setApiKey } = useApiKey()
  const [mode, setMode] = useState<'welcome' | 'create' | 'existing' | 'success'>('welcome')
  const [newKeyName, setNewKeyName] = useState('')
  const [existingKey, setExistingKey] = useState('')
  const [newKeyFull, setNewKeyFull] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Crear nova API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    setIsCreating(true)
    try {
      // Per crear la primera key, fem una crida especial sense autenticació
      // o usem un endpoint de setup inicial
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })

      if (!response.ok) {
        // Si falla perquè cal autenticació, redirigim a settings
        router.push('/settings/keys')
        return
      }

      const data = await response.json()
      setNewKeyFull(data.fullKey)
      setMode('success')
      
      // Guardar automàticament
      setApiKey(data.fullKey)
    } catch (error) {
      console.error('Error creating key:', error)
      toast.error('Failed to create API key. Please go to settings.')
      router.push('/settings/keys')
    } finally {
      setIsCreating(false)
    }
  }

  // Configurar API key existent
  const handleSetExistingKey = () => {
    if (!existingKey.trim()) {
      toast.error('Please enter an API key')
      return
    }

    // Validar format
    if (!existingKey.startsWith('dk_')) {
      toast.error('Invalid API key format. Should start with "dk_"')
      return
    }

    setApiKey(existingKey.trim())
    toast.success('API key configured!')
    onKeyConfigured?.()
    onClose()
  }

  // Copiar key al portapapers
  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKeyFull)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('API key copied!')
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  // Tancar després de success
  const handleSuccessClose = () => {
    onKeyConfigured?.()
    onClose()
    // Reset mode per la propera vegada
    setTimeout(() => setMode('welcome'), 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose()
    }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {mode === 'welcome' && (
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Welcome to DockerClaw</DialogTitle>
              <DialogDescription className="text-base">
                To get started, you need to configure an API key.
                <br /><br />
                This key will be used to authenticate your requests to the API.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button size="lg" onClick={() => setMode('create')} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New API Key
              </Button>
              <Button size="lg" variant="outline" onClick={() => setMode('existing')} className="w-full">
                <Key className="h-4 w-4 mr-2" />
                I Already Have a Key
              </Button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Give your new API key a descriptive name.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Key Name</label>
              <Input
                placeholder="e.g., My Laptop, Production Server"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateKey()
                }}
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setMode('welcome')} className="sm:flex-1">
                Back
              </Button>
              <Button onClick={handleCreateKey} disabled={isCreating} className="sm:flex-1">
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
          </>
        )}

        {mode === 'existing' && (
          <>
            <DialogHeader>
              <DialogTitle>Enter Your API Key</DialogTitle>
              <DialogDescription>
                Paste your existing API key below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <Input
                type="password"
                placeholder="dk_..."
                value={existingKey}
                onChange={(e) => setExistingKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetExistingKey()
                }}
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setMode('welcome')} className="sm:flex-1">
                Back
              </Button>
              <Button onClick={handleSetExistingKey} className="sm:flex-1">
                Save Key
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === 'success' && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="text-center">Your API Key is Ready!</DialogTitle>
              <DialogDescription className="text-center">
                <strong className="text-amber-500">Important:</strong> This is the <strong>only time</strong> you'll see this key.
                <br /><br />
                Copy it now and store it securely.
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
              <Button onClick={handleSuccessClose} className="w-full">
                Start Using DockerClaw
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyModal
