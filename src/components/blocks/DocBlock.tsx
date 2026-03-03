// ============================================
// DocBlock — WYSIWYG rich text editor (Tiptap)
// ============================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TiptapLink from '@tiptap/extension-link';
import { Table as TiptapTable } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import mermaid from 'mermaid';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Code2,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table2,
  Hash,
  X,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocBlockData } from '@/types';

// ─── Lowlight ─────────────────────────────────────────────────────────────────
const lowlight = createLowlight(common);

// ─── Mermaid ──────────────────────────────────────────────────────────────────
let mermaidReady = false;
function ensureMermaid() {
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
    mermaidReady = true;
  }
}

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code.trim() || !containerRef.current) {
      setLoading(false);
      return;
    }
    ensureMermaid();
    setError(null);
    setLoading(true);
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, code)
      .then(({ svg }: { svg: string }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Render error');
        setLoading(false);
      });
  }, [code]);

  if (error) {
    return (
      <div className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg p-3">
        <span className="font-semibold">Diagram error: </span>
        {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-6">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Rendering diagram…
        </div>
      )}
      <div
        ref={containerRef}
        className={cn('[&>svg]:max-w-full', loading && 'hidden')}
      />
    </div>
  );
}

// ─── Mermaid NodeView ─────────────────────────────────────────────────────────
function MermaidBlockView({ node, editor, getPos }: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const code = node.textContent;

  function openEdit() {
    setDraft(code);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 30);
  }

  function applyEdit() {
    if (typeof getPos !== 'function') return;
    const pos = getPos();
    if (pos === undefined) return;
    const { tr, schema } = editor.state;
    const content = draft ? [schema.text(draft)] : [];
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, content);
    editor.view.dispatch(tr);
    setIsEditing(false);
  }

  return (
    <NodeViewWrapper contentEditable={false} className="my-4 not-prose">
      <div className="rounded-xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/70 border-b border-indigo-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <GitBranch className="w-3.5 h-3.5" />
            Mermaid diagram
          </div>
          <div className="flex items-center gap-1.5">
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-gray-500 hover:text-gray-700"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant={isEditing ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs px-2.5"
              onMouseDown={(e) => {
                e.preventDefault();
                if (isEditing) applyEdit();
                else openEdit();
              }}
            >
              {isEditing ? 'Apply' : 'Edit source'}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full font-mono text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[120px] leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditing(false);
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') applyEdit();
                }}
                placeholder={'graph TD\n  A[Start] --> B[End]'}
              />
              <p className="text-xs text-gray-400">
                Cmd/Ctrl+Enter to apply · Esc to cancel
              </p>
            </div>
          ) : code.trim() ? (
            <MermaidDiagram code={code} />
          ) : (
            <button
              className="w-full flex flex-col items-center py-8 text-gray-400 hover:text-gray-600 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                openEdit();
              }}
            >
              <GitBranch className="w-8 h-8 mb-2 opacity-25" />
              <span className="text-sm">Click to write diagram</span>
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ─── Code Block NodeView ──────────────────────────────────────────────────────
function CodeBlockNodeView(props: NodeViewProps) {
  const language = (props.node.attrs.language as string | null) ?? '';

  if (language === 'mermaid') {
    return <MermaidBlockView {...props} />;
  }

  return (
    <NodeViewWrapper className="my-4 not-prose">
      <div className="rounded-xl bg-gray-950 overflow-hidden shadow-sm">
        {language && (
          <div className="px-4 py-1.5 bg-gray-900 border-b border-gray-800 flex items-center">
            <span className="text-xs text-gray-400 font-mono tracking-wide">{language}</span>
          </div>
        )}
        <pre className="p-4 overflow-x-auto m-0">
          <code className={cn('text-sm text-gray-100 font-mono leading-relaxed bg-transparent', language && `language-${language}`)}>
            <NodeViewContent />
          </code>
        </pre>
      </div>
    </NodeViewWrapper>
  );
}

// ─── Tiptap extensions (defined once, outside component) ─────────────────────
const editorExtensions = [
  StarterKit.configure({
    codeBlock: false, // replaced by CodeBlockLowlight
    heading: { levels: [1, 2, 3] },
  }),
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockNodeView);
    },
  }).configure({ lowlight, defaultLanguage: 'plaintext' }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TiptapLink.configure({ openOnClick: false, autolink: true }),
  TiptapTable.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
];

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function ToolbarBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors',
            active && 'bg-gray-100 text-gray-900'
          )}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />;
}

// ─── DocBlock ─────────────────────────────────────────────────────────────────
interface DocBlockProps {
  data: DocBlockData;
  onUpdate: (data: Partial<DocBlockData>) => void;
  isSelected?: boolean;
  onStartConnection?: () => void;
  isConnecting?: boolean;
}

export function DocBlock({ data, onUpdate }: DocBlockProps) {
  const [newTag, setNewTag] = useState('');
  // Track the last markdown we emitted to avoid circular re-syncs
  const lastEmitted = useRef(data.contentMarkdown);

  const editor = useEditor({
    extensions: editorExtensions,
    content: data.contentMarkdown || '',
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm max-w-none outline-none min-h-full',
          // Headings
          'prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900',
          'prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-2 prose-h1:pb-2 prose-h1:border-b prose-h1:border-gray-100',
          'prose-h2:text-lg prose-h2:mt-3 prose-h2:mb-1.5',
          'prose-h3:text-base prose-h3:mt-3 prose-h3:mb-1',
          // Text
          'prose-p:text-gray-700 prose-p:leading-relaxed',
          // Inline code
          'prose-code:bg-gray-100 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5',
          'prose-code:text-sm prose-code:font-mono prose-code:text-gray-800',
          'prose-code:before:content-none prose-code:after:content-none',
          // Pre / code blocks — let NodeView handle these; zero out prose defaults
          'prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-0',
          // Blockquote
          'prose-blockquote:border-l-4 prose-blockquote:border-blue-400',
          'prose-blockquote:bg-blue-50/40 prose-blockquote:pl-4 prose-blockquote:py-1',
          'prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700',
          // Links
          'prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
          // Tables
          'prose-table:border-collapse prose-table:w-full',
          'prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:font-semibold',
          'prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2',
          // Lists
          'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
          // HR
          'prose-hr:border-gray-200',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
      lastEmitted.current = markdown;
      onUpdate({ contentMarkdown: markdown });
    },
  });

  // Sync when content changes externally (e.g., AI writes to the block)
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return; // don't interrupt typing
    if (data.contentMarkdown === lastEmitted.current) return; // our own update
    lastEmitted.current = data.contentMarkdown;
    editor.commands.setContent(data.contentMarkdown || '');
  }, [data.contentMarkdown, editor]);

  // Tags
  const handleAddTag = useCallback(() => {
    const tag = newTag.trim();
    if (tag && !data.tags?.includes(tag)) {
      onUpdate({ tags: [...(data.tags || []), tag] });
      setNewTag('');
    }
  }, [newTag, data.tags, onUpdate]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      onUpdate({ tags: data.tags?.filter((t) => t !== tag) || [] });
    },
    [data.tags, onUpdate]
  );

  // Word count from stored markdown (quick heuristic) — memoised so it only
  // recomputes when the markdown content actually changes.
  const wordCount = useMemo(
    () =>
      (data.contentMarkdown || '')
        .replace(/```[\s\S]*?```/g, '') // strip code blocks
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    [data.contentMarkdown]
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-white">
        {/* ── Tags ── */}
        <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap gap-1.5 items-center min-h-[38px]">
          {data.tags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs gap-1 pr-1 hover:bg-gray-200 transition-colors"
            >
              <Hash className="w-2.5 h-2.5 opacity-50" />
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder={data.tags?.length ? '+ tag' : '+ Add tag'}
            className="h-5 w-20 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
          />
        </div>

        {/* ── Toolbar ── */}
        {editor && (
          <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60">
            {/* Text */}
            <ToolbarBtn
              label="Bold"
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Italic"
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Strikethrough"
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Inline code"
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="w-3.5 h-3.5" />
            </ToolbarBtn>

            <Sep />

            {/* Headings */}
            <ToolbarBtn
              label="Heading 1"
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Heading 2"
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Heading 3"
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="w-3.5 h-3.5" />
            </ToolbarBtn>

            <Sep />

            {/* Lists */}
            <ToolbarBtn
              label="Bullet list"
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Numbered list"
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Task list"
              active={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </ToolbarBtn>

            <Sep />

            {/* Blocks */}
            <ToolbarBtn
              label="Blockquote"
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Code block"
              active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <Code2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Mermaid diagram"
              active={editor.isActive('codeBlock', { language: 'mermaid' })}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'codeBlock',
                    attrs: { language: 'mermaid' },
                    content: [{ type: 'text', text: 'graph TD\n  A[Start] --> B[End]' }],
                  })
                  .run()
              }
            >
              <GitBranch className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Link"
              active={editor.isActive('link')}
              onClick={() => {
                const prev = editor.getAttributes('link').href as string | undefined;
                const url = window.prompt('URL', prev ?? 'https://');
                if (url === null) return;
                if (url === '') {
                  editor.chain().focus().unsetLink().run();
                } else {
                  editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
                }
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Table"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              <Table2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              label="Horizontal rule"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="w-3.5 h-3.5" />
            </ToolbarBtn>
          </div>
        )}

        {/* ── Editor ── */}
        <div className="flex-1 overflow-auto">
          <EditorContent
            editor={editor}
            className="h-full [&_.ProseMirror]:p-4 [&_.ProseMirror]:min-h-full [&_.ProseMirror]:cursor-text [&_.ProseMirror_ul[data-type=taskList]>li]:list-none [&_.ProseMirror_ul[data-type=taskList]>li]:flex [&_.ProseMirror_ul[data-type=taskList]>li]:gap-2 [&_.ProseMirror_ul[data-type=taskList]>li]:pl-0 [&_.ProseMirror_ul[data-type=taskList]>li>label]:flex [&_.ProseMirror_ul[data-type=taskList]>li>label]:items-center [&_.ProseMirror_ul[data-type=taskList]>li>label]:shrink-0 [&_.ProseMirror_.tableWrapper]:overflow-x-auto [&_.ProseMirror_table]:border-collapse"
          />
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-1.5 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 select-none">
          <span className="font-medium text-gray-500">Document</span>
          <span>{wordCount} words</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
