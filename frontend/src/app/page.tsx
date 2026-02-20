'use client'

import { useState } from 'react'
import { Canvas } from '@/components/Canvas'
import { DndProvider } from '@/components/DndProvider'
import { Notifications } from '@/components/Notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Settings, Users, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useBoardStore } from '@/lib/store'

export default function Home() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addCard = useBoardStore((state) => state.addCard)

  const handleCreateCard = async () => {
    if (!title.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      // Get available templates first
      const { templates } = await api.getTemplates()
      
      if (templates.length === 0) {
        setError('No templates available. Please create a template first.')
        setIsCreating(false)
        return
      }

      // Use the first available template
      const template = templates[0]

      const newCard = await api.createCard({
        template_id: template.id,
        data: {
          title: title.trim(),
          description: description.trim(),
          type: 'text',
        },
      })

      addCard(newCard)
      setOpen(false)
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg">DockerClaw</h1>
          <Badge variant="secondary" className="text-xs">C2H</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Notifications />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agents</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Card</DialogTitle>
                <DialogDescription>
                  Add a new card to your board. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter card title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleCreateCard()
                      }
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter card description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500">{error}</div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCard}
                  disabled={isCreating || !title.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Card'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 overflow-hidden">
        <Canvas>
          <DndProvider />
        </Canvas>
      </main>
    </div>
  )
}
