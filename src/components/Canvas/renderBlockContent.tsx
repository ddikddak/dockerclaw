// ============================================
// Render Block Content - Factory for block components
// ============================================

import { 
  DocBlock, 
  KanbanBlock, 
  InboxBlock, 
  ChecklistBlock, 
  TableBlock, 
  TextBlock, 
  FolderBlock, 
  ImageBlock, 
  HeadingBlock 
} from '@/components/blocks';
import type { 
  Block, 
  BlockData,
  DocBlockData, 
  KanbanBlockData, 
  InboxBlockData, 
  ChecklistBlockData,
  TableBlockData,
  TextBlockData,
  ImageBlockData,
  HeadingBlockData,
  FolderBlockData,
  Connection
} from '@/types';

interface RenderOptions {
  connectedBlockIds: string[];
  allBlocks: Block[];
  connections?: Connection[];
  onBlockDataUpdate: (id: string, updates: Partial<BlockData>) => void;
  onCardMoveBetweenBlocks: (fromId: string, toId: string, card: { id: string; title?: string; [key: string]: unknown }) => void;
  onConvertToTask: (item: { id: string; title: string; bodyMarkdown: string }) => void;
  onConvertToDoc: (item: { id: string; title: string; bodyMarkdown: string }) => void;
  isSelected: boolean;
}

export function renderBlockContent(
  block: Block,
  options: RenderOptions
): React.ReactNode {
  const { 
    connectedBlockIds, 
    allBlocks, 
    onBlockDataUpdate, 
    onCardMoveBetweenBlocks,
    onConvertToTask,
    onConvertToDoc,
    isSelected 
  } = options;
  
  const blockData = block.data || {};
  
  const handleUpdate = (updates: Partial<BlockData>) => {
    onBlockDataUpdate(block.id, updates);
  };
  
  switch (block.type) {
    case 'doc':
      return <DocBlock data={blockData as DocBlockData} onUpdate={handleUpdate} />;
      
    case 'kanban':
      return (
        <KanbanBlock
          data={blockData as KanbanBlockData}
          onUpdate={handleUpdate}
          connectedBlocks={connectedBlockIds}
          onCardMoveToBlock={(card, targetBlockId) => 
            onCardMoveBetweenBlocks(block.id, targetBlockId, card as unknown as { id: string; title?: string; [key: string]: unknown })
          }
          allBlocks={allBlocks}
        />
      );
      
    case 'inbox':
      return (
        <InboxBlock 
          data={blockData as InboxBlockData} 
          onUpdate={handleUpdate} 
          onConvertToTask={onConvertToTask} 
          onConvertToDoc={onConvertToDoc} 
        />
      );
      
    case 'checklist':
      return <ChecklistBlock data={blockData as ChecklistBlockData} onUpdate={handleUpdate} />;
      
    case 'table':
      return (
        <TableBlock
          data={blockData as TableBlockData}
          onUpdate={handleUpdate}
          connectedBlocks={connectedBlockIds}
          onCardMoveToBlock={(card, targetBlockId) => 
            onCardMoveBetweenBlocks(block.id, targetBlockId, card as unknown as { id: string; title?: string; [key: string]: unknown })
          }
          allBlocks={allBlocks}
        />
      );
      
    case 'text':
      return <TextBlock data={blockData as TextBlockData} onUpdate={handleUpdate} />;
      
    case 'image':
      return <ImageBlock data={blockData as ImageBlockData} onUpdate={handleUpdate} />;
      
    case 'heading':
      return (
        <HeadingBlock 
          data={blockData as HeadingBlockData} 
          onUpdate={handleUpdate} 
          isSelected={isSelected} 
        />
      );
      
    case 'folder':
      return (
        <FolderBlock
          data={{ ...blockData, id: block.id } as FolderBlockData}
          onUpdate={handleUpdate}
        />
      );
      
    default:
      return <div className="p-4 text-gray-500">Unknown block type: {block.type}</div>;
  }
}
