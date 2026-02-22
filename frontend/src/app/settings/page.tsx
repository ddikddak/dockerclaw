'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Key, User, Mail } from 'lucide-react'

export default function SettingsPage() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <MainLayout>
      <div className="h-full p-8 bg-[#f5f5f5] overflow-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your account and preferences
            </p>
          </div>

          {/* Profile Section */}
          <section className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{user?.email || 'Not logged in'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* API Keys Section */}
          <section className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900 uppercase tracking-wide">API Keys</h2>
            </div>
            <p className="text-sm text-gray-500">
              API key management coming soon.
            </p>
          </section>

          {/* Logout Section */}
          <section className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-gray-400" />
                <div>
                  <h2 className="text-sm font-medium text-gray-900">Logout</h2>
                  <p className="text-xs text-gray-500">Sign out of your account</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}