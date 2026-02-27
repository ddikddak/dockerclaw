// ============================================
// Heading Block - Clean text labels and annotations
// Renders chromeless (no card background) directly on canvas
// Draggable by default, edit style via menu only
// ============================================

import { useRef, useCallback, useEffect, useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Plus,
  Move,
} from 'lucide-react';
import type { HeadingBlockData, HeadingLevel } from '@/types';

interface HeadingBlockProps {
  data: HeadingBlockData;
  onUpdate: (data: Partial<HeadingBlockData>) => void;
  isSelected?: boolean;
  // Controlled from BlockWrapper via cloneElement
  isEditingStyle?: boolean;
  onExitEditStyle?: () => void;
}

const LEVEL_DEFAULTS: Record<HeadingLevel, { fontSize: number; fontWeight: number; lineHeight: number }> = {
  h1: { fontSize: 32, fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.6 },
};

const FONT_FAMILIES = [
  { label: 'System', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'ui-serif, Georgia, Cambria, serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, monospace' },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
];

const COLOR_PRESETS = [
  '#1f2937', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ffffff', '#000000',
];

export function HeadingBlock({ data, onUpdate, isSelected: _isSelected, isEditingStyle, onExitEditStyle }: HeadingBlockProps) {
  const editRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const levelDefaults = LEVEL_DEFAULTS[data.level] || LEVEL_DEFAULTS.h1;
  const currentFontSize = data.fontSize ?? levelDefaults.fontSize;
  const currentFontFamily = data.fontFamily || FONT_FAMILIES[0].value;
  const currentFontLabel = FONT_FAMILIES.find(f => f.value === currentFontFamily)?.label || 'System';

  const textStyle: React.CSSProperties = {
    fontSize: currentFontSize,
    fontWeight: data.bold ? 700 : levelDefaults.fontWeight,
    fontStyle: data.italic ? 'italic' : 'normal',
    textDecoration: data.underline ? 'underline' : 'none',
    textDecorationColor: data.underline ? (data.color || '#1f2937') : undefined,
    color: data.color || '#1f2937',
    lineHeight: levelDefaults.lineHeight,
    textAlign: data.align || 'left',
    fontFamily: currentFontFamily,
  };

  const stopDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleInput = useCallback(() => {
    if (editRef.current) {
      onUpdate({ content: editRef.current.textContent || '' });
    }
  }, [onUpdate]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't exit if focus moves within our editor area
    const editor = e.currentTarget.closest('[data-heading-editor]');
    if (editor?.contains(e.relatedTarget as Node)) return;
    onExitEditStyle?.();
  }, [onExitEditStyle]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const adjustFontSize = useCallback((delta: number) => {
    const newSize = Math.max(8, Math.min(120, currentFontSize + delta));
    onUpdate({ fontSize: newSize });
  }, [currentFontSize, onUpdate]);

  const handleLevelChange = useCallback((level: HeadingLevel) => {
    onUpdate({ level, fontSize: LEVEL_DEFAULTS[level].fontSize });
  }, [onUpdate]);

  // Focus the contentEditable when entering edit style mode
  useEffect(() => {
    if (isEditingStyle && editRef.current) {
      editRef.current.textContent = data.content;
      editRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (editRef.current.childNodes.length > 0) {
        range.selectNodeContents(editRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditingStyle]);

  // ---------- Editing style mode ----------
  if (isEditingStyle) {
    return (
      <div
        className="h-full relative"
        data-heading-editor
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
      >
        {/* Floating toolbar above the block */}
        <div className="absolute left-0 bottom-full mb-2 z-30 flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200">
          {/* Level presets */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-7 px-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1">
                {data.level === 'body' ? 'Body' : data.level.toUpperCase()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" sideOffset={4}>
              {(['h1', 'h2', 'h3', 'body'] as HeadingLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleLevelChange(level)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors
                    ${data.level === level ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
                >
                  <span style={{ fontSize: Math.max(12, LEVEL_DEFAULTS[level].fontSize * 0.45), fontWeight: LEVEL_DEFAULTS[level].fontWeight }}>
                    {level === 'body' ? 'Body text' : `Heading ${level.slice(1)}`}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Font size */}
          <button onClick={() => adjustFontSize(-2)} className="h-7 w-7 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-xs font-medium w-7 text-center tabular-nums select-none">{currentFontSize}</span>
          <button onClick={() => adjustFontSize(2)} className="h-7 w-7 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Font family */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-7 px-2 text-xs font-medium rounded-md hover:bg-gray-100 transition-colors">
                {currentFontLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="start" sideOffset={4}>
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onUpdate({ fontFamily: font.value })}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors
                    ${currentFontFamily === font.value ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Style toggles */}
          <Toggle size="sm" pressed={data.bold} onPressedChange={(v) => onUpdate({ bold: v })}>
            <Bold className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={data.italic} onPressedChange={(v) => onUpdate({ italic: v })}>
            <Italic className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={data.underline} onPressedChange={(v) => onUpdate({ underline: v })}>
            <Underline className="w-3.5 h-3.5" />
          </Toggle>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Alignment */}
          <Toggle size="sm" pressed={data.align === 'left'} onPressedChange={() => onUpdate({ align: 'left' })}>
            <AlignLeft className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={data.align === 'center'} onPressedChange={() => onUpdate({ align: 'center' })}>
            <AlignCenter className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={data.align === 'right'} onPressedChange={() => onUpdate({ align: 'right' })}>
            <AlignRight className="w-3.5 h-3.5" />
          </Toggle>

          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-7 w-7 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-center">
                <div
                  className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                  style={{ backgroundColor: data.color || '#1f2937' }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2.5" align="start" sideOffset={4}>
              <div className="grid grid-cols-6 gap-1.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdate({ color })}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110
                      ${data.color === color ? 'border-blue-500 scale-110' : 'border-gray-200'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Editable content */}
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onInput={handleInput}
          onPaste={handlePaste}
          className="w-full h-full outline-none whitespace-pre-wrap break-words cursor-text"
          style={textStyle}
        />
      </div>
    );
  }

  // ---------- Default mode: draggable, not editable ----------
  return (
    <div
      className="h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Move icon on hover (hidden when locked) */}
      {isHovered && !data.content && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Move className="w-5 h-5 text-gray-300" />
        </div>
      )}
      {isHovered && data.content && (
        <div className="absolute top-0 right-0 pointer-events-none">
          <Move className="w-4 h-4 text-gray-300" />
        </div>
      )}

      <div className="whitespace-pre-wrap break-words h-full" style={textStyle}>
        {data.content || (
          <span className="text-gray-300 italic" style={{ fontSize: currentFontSize * 0.75, fontWeight: 400, fontFamily: currentFontFamily }}>
            Type something...
          </span>
        )}
      </div>
    </div>
  );
}
