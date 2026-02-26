// ============================================
// Text Block - Modern sticky note style
// ============================================

import { useState, useCallback } from 'react';
import type { TextBlockData } from '@/types';

interface TextBlockProps {
  data: TextBlockData;
  onUpdate: (data: Partial<TextBlockData>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
}

export function TextBlock({ data, onUpdate }: TextBlockProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ content: e.target.value });
    },
    [onUpdate]
  );

  if (isEditing) {
    return (
      <div className="h-full p-4">
        <textarea
          value={data.content}
          onChange={handleChange}
          onBlur={() => setIsEditing(false)}
          className="w-full h-full resize-none border-0 bg-transparent focus:ring-0 p-0 outline-none"
          style={{
            fontSize: data.fontSize || 14,
            color: data.color || '#1f2937',
            lineHeight: 1.5,
          }}
          autoFocus
          placeholder="Type something..."
        />
      </div>
    );
  }

  return (
    <div
      className="h-full p-4 overflow-auto cursor-text"
      onClick={() => setIsEditing(true)}
    >
      <div
        className="whitespace-pre-wrap text-sm leading-relaxed"
        style={{
          fontSize: data.fontSize || 14,
          color: data.color || '#1f2937',
        }}
      >
        {data.content ? (
          data.content
        ) : (
          <span className="text-gray-400 italic">Click to add text...</span>
        )}
      </div>
    </div>
  );
}
