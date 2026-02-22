'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleToggle = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#f5f5f5]">
      {/* Sidebar */}
      <div className={cn('flex-shrink-0', isMobile && collapsed && 'hidden')}>
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </div>

      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-10"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
