// ============================================
// Image Block - Display and upload images
// ============================================

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, RefreshCw } from 'lucide-react';
import type { ImageBlockData } from '@/types';

interface ImageBlockProps {
  data: ImageBlockData;
  onUpdate: (data: Partial<ImageBlockData>) => void;
}

export function ImageBlock({ data, onUpdate }: ImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({
        base64: reader.result as string,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onUpdate]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!data.base64) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-3 p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={openFilePicker}
      >
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">Click to upload image</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Browse files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative group">
      <div className="flex-1 min-h-0 p-2">
        <img
          src={data.base64}
          alt={data.caption || data.fileName || 'Image'}
          className="w-full h-full object-contain rounded"
          draggable={false}
        />
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-white/80 backdrop-blur-sm shadow-sm"
          onClick={openFilePicker}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
