'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImageIcon, X, ZoomIn, Upload } from 'lucide-react'

interface ImageComponentProps {
  data: {
    url?: string
    filename?: string
    size?: number
  }
  cardId?: string
  componentId?: string
  editable?: boolean
  onUpload?: (file: File) => Promise<void>
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function ImageComponent({
  data,
  cardId,
  componentId = 'image',
  editable = false,
  onUpload,
}: ImageComponentProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const url = data?.url
  const filename = data?.filename || 'image'
  const size = data?.size

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (editable) setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (!editable || !onUpload) return
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      await onUpload(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      await onUpload(file)
    }
  }

  // Empty state - show upload placeholder
  if (!url) {
    return (
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${editable ? 'cursor-pointer' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {editable ? (
          <label className="cursor-pointer block">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isDragging ? 'Drop image here' : 'Click or drag to upload image'}
            </p>
          </label>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No image</p>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className="relative rounded-lg overflow-hidden bg-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div
          className="relative aspect-video cursor-pointer group"
          onClick={() => setIsLightboxOpen(true)}
        >
          <Image
            src={url}
            alt={filename}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          
          {/* Hover overlay */}
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <ZoomIn className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* File info */}
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-600 truncate" title={filename}>
              {filename}
            </p>
            {size && (
              <p className="text-xs text-gray-400">
                {formatFileSize(size)}
              </p>
            )}
          </div>
          {editable && (
            <label className="cursor-pointer ml-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <Upload className="h-3 w-3" />
              </Button>
            </label>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-50"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <img
              src={url}
              alt={filename}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
