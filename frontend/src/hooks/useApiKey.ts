'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'dockerclaw_api_key'

export interface ApiKeyData {
  key: string
  name?: string
  prefix?: string
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar la API key del localStorage en mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      setApiKeyState(stored)
      setIsLoading(false)
    }
  }, [])

  // Guardar API key
  const setApiKey = useCallback((key: string | null) => {
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem(STORAGE_KEY, key)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      setApiKeyState(key)
    }
  }, [])

  // Eliminar API key
  const removeApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      setApiKeyState(null)
    }
  }, [])

  // Verificar si hi ha una API key configurada
  const hasApiKey = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem(STORAGE_KEY)
  }, [])

  // Obtenir el prefix de la key per mostrar (ex: dk_abc123...)
  const getKeyPrefix = useCallback((): string | null => {
    if (!apiKey) return null
    if (apiKey.length < 12) return apiKey
    return `${apiKey.substring(0, 12)}...`
  }, [apiKey])

  // Validar que la API key té format correcte
  const isValidFormat = useCallback((key: string): boolean => {
    return key.startsWith('dk_') && key.length >= 10
  }, [])

  return {
    apiKey,
    setApiKey,
    removeApiKey,
    hasApiKey,
    getKeyPrefix,
    isValidFormat,
    isLoading,
  }
}

// Funció utilitària per obtenir la API key des de qualsevol lloc
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

// Funció utilitària per guardar la API key
export function setStoredApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key)
  }
}

// Funció utilitària per eliminar la API key
export function removeStoredApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
