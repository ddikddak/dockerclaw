'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'API Docs', href: '/docs/api', icon: Code },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .slice(0, 2)
      .toUpperCase()
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <aside
      className="h-full bg-white border-r border-gray-100 flex flex-col"
      style={{ width: collapsed ? 64 : 200 }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-50">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-medium">DC</span>
            </div>
            <span className="font-medium text-sm text-gray-900">DockerClaw</span>
          </div>
        )}
        {collapsed && (
          <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center mx-auto">
            <span className="text-white text-[10px] font-medium">DC</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm">{item.name}</span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="p-2 border-t border-gray-50">
        <div className="relative">
          <button
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50',
              collapsed && 'justify-center'
            )}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600 text-xs font-medium">
                {user?.email ? getInitials(user.email) : 'U'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm text-gray-900 truncate">{user?.email?.split('@')[0] || 'User'}</p>
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full mb-2 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50 w-40">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}