'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: any | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; data: any }>
  signOut: () => Promise<void>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Rutes públiques que no requereixen autenticació
const publicRoutes = ['/login', '/signup', '/auth/callback']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Comprovar sessió actual
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Escuchar canvis d'autenticació
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setIsLoading(false)

        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Protegir rutes
  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))
      
      if (!user && !isPublicRoute) {
        router.push('/login')
      } else if (user && pathname === '/login') {
        router.push('/')
      }
    }
  }, [user, isLoading, pathname, router])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const getToken = () => {
    return session?.access_token ?? null
  }

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    getToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook per protegir components
export function useRequireAuth() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  return { user, isLoading }
}
