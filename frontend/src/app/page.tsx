'use client'

import { Canvas } from '@/components/Canvas'
import { DndProvider } from '@/components/DndProvider'
import { Notifications } from '@/components/Notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Settings, Users } from 'lucide-react'

export default function Home() {
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

          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            New Card
          </Button>
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
