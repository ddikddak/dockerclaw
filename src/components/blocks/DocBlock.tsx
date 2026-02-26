// ============================================
// Doc Block - Modern inline Markdown Editor
// ============================================

import { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Bold, Italic, Heading, List, CheckSquare, Code, Link } from 'lucide-react';
import type { DocBlockData } from '@/types';

interface DocBlockProps {
  data: DocBlockData;
  onUpdate: (data: Partial<DocBlockData>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
}

export function DocBlock({ data, onUpdate }: DocBlockProps) {
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ contentMarkdown: e.target.value });
    },
    [onUpdate]
  );

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !data.tags?.includes(newTag.trim())) {
      onUpdate({ tags: [...(data.tags || []), newTag.trim()] });
      setNewTag('');
    }
  }, [newTag, data.tags, onUpdate]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onUpdate({ tags: data.tags?.filter((t) => t !== tagToRemove) || [] });
    },
    [data.tags, onUpdate]
  );

  // Insert markdown at cursor position
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = data.contentMarkdown;
    const beforeText = text.substring(0, start);
    const selectedText = text.substring(start, end);
    const afterText = text.substring(end);

    const newText = beforeText + before + selectedText + after + afterText;
    onUpdate({ contentMarkdown: newText });

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tags */}
      <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5 items-center">
        {data.tags?.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1 hover:bg-gray-200 transition-colors">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="+ Add tag"
            className="h-6 w-24 text-xs border-0 bg-transparent focus:bg-gray-50 focus:ring-1"
          />
        </div>
      </div>

      {/* Toolbar */}
      {isEditing && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('**', '**')}>
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('*', '*')}>
            <Italic className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('# ')}>
            <Heading className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('- ')}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('- [ ] ')}>
            <CheckSquare className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('`', '`')}>
            <Code className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertMarkdown('[', '](url)')}>
            <Link className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={data.contentMarkdown}
            onChange={handleContentChange}
            className="w-full h-full resize-none p-4 font-mono text-sm leading-relaxed bg-white focus:outline-none"
            placeholder="# Your document title\n\nStart writing in markdown..."
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <div 
            className="p-4 min-h-full cursor-text"
            onClick={() => setIsEditing(true)}
          >
            <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2">
              {data.contentMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.contentMarkdown}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">Click to start writing...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-1.5 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
        <span>{isEditing ? 'Editing mode' : 'Click to edit'}</span>
        <span>{data.contentMarkdown?.length || 0} chars</span>
      </div>
    </div>
  );
}
