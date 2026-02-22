'use client'

import { toast as sonnerToast } from 'sonner'

// Tipus de notificacions
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Wrapper hook per toasts amb presets comuns
export function useToast() {
  const showToast = (type: ToastType, title: string, options?: ToastOptions) => {
    const config = {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    }

    switch (type) {
      case 'success':
        return sonnerToast.success(title, config)
      case 'error':
        return sonnerToast.error(title, config)
      case 'warning':
        return sonnerToast.warning(title, config)
      case 'info':
        return sonnerToast.info(title, config)
      case 'loading':
        return sonnerToast.loading(title, config)
      default:
        return sonnerToast(title, config)
    }
  }

  // Presets específics per accions de l'app
  const card = {
    created: (title?: string) =>
      sonnerToast.success(title || 'Card created', {
        description: 'Your card has been created successfully.',
        icon: '🎉',
      }),
    updated: (title?: string) =>
      sonnerToast.success(title || 'Card updated', {
        description: 'Your changes have been saved.',
        icon: '✅',
      }),
    deleted: (title?: string) =>
      sonnerToast.success(title || 'Card deleted', {
        description: 'The card has been permanently deleted.',
        icon: '🗑️',
      }),
    archived: (title?: string) =>
      sonnerToast.success(title || 'Card archived', {
        description: 'The card has been moved to archives.',
        icon: '📦',
      }),
  }

  const template = {
    created: (name?: string) =>
      sonnerToast.success(name ? `Template "${name}" created` : 'Template created', {
        description: 'Your template is ready to use.',
        icon: '📋',
      }),
    updated: (name?: string) =>
      sonnerToast.success(name ? `Template "${name}" updated` : 'Template updated', {
        description: 'Your changes have been saved.',
        icon: '✅',
      }),
    deleted: (name?: string) =>
      sonnerToast.success(name ? `Template "${name}" deleted` : 'Template deleted', {
        description: 'The template has been permanently deleted.',
        icon: '🗑️',
      }),
  }

  const tags = {
    updated: () =>
      sonnerToast.success('Tags updated', {
        description: 'Card tags have been saved.',
        icon: '🏷️',
      }),
  }

  const error = {
    api: (message?: string) =>
      sonnerToast.error(message || 'Something went wrong', {
        description: 'Please try again later.',
        icon: '❌',
      }),
    network: () =>
      sonnerToast.error('Network error', {
        description: 'Please check your connection and try again.',
        icon: '🌐',
      }),
    validation: (message: string) =>
      sonnerToast.warning(message, {
        description: 'Please fix the errors and try again.',
        icon: '⚠️',
      }),
  }

  const clipboard = {
    copied: (what?: string) =>
      sonnerToast.success(what ? `${what} copied!` : 'Copied to clipboard', {
        description: 'You can now paste it anywhere.',
        icon: '📋',
      }),
  }

  return {
    show: showToast,
    success: (title: string, options?: ToastOptions) => showToast('success', title, options),
    error: (title: string, options?: ToastOptions) => showToast('error', title, options),
    warning: (title: string, options?: ToastOptions) => showToast('warning', title, options),
    info: (title: string, options?: ToastOptions) => showToast('info', title, options),
    loading: (title: string, options?: ToastOptions) => showToast('loading', title, options),
    // Presets específics
    card,
    template,
    tags,
    errors: error,
    clipboard,
    // Dismiss
    dismiss: sonnerToast.dismiss,
  }
}

// Export també la funció toast directa per quan no podem usar hooks
export { sonnerToast as toast }
