// ============================================
// Main App Component - Mobile Responsive
// Backend API Integration (DockerClaw v1)
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { BoardService, DocumentService, type DocumentPreview } from '@/services/db';
import { BoardsApiService } from '@/services/boardsApi';
import { BoardSelector } from '@/components/BoardSelector';
import { Toolbar } from '@/components/Toolbar';
import { Canvas } from '@/components/Canvas';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Menu } from 'lucide-react';
import type { Board, Block, BlockType, Agent } from '@/types';

function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  // Load documents when current board changes
  useEffect(() => {
    if (currentBoardId) {
      loadDocuments(currentBoardId);
      // Load agents from board settings
      const board = boards.find(b => b.id === currentBoardId);
      if (board?.settings?.agents) {
        setAgents(board.settings.agents);
      } else {
        setAgents([]);
      }
    } else {
      setDocuments([]);
      setAgents([]);
    }
  }, [currentBoardId, boards]);

  const loadBoards = async () => {
    try {
      const allBoards = await BoardService.getAll();
      setBoards(allBoards);
      
      // Select first board if none selected
      if (allBoards.length > 0 && !currentBoardId) {
        setCurrentBoardId(allBoards[0].id);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      toast.error('Failed to load boards. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocuments = async (boardId: string) => {
    try {
      const docs = await DocumentService.getAll(boardId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleCreateBoard = useCallback(async (name: string) => {
    try {
      const newBoard = await BoardsApiService.create({
        name,
      });
      
      setBoards((prev) => [newBoard, ...prev]);
      setCurrentBoardId(newBoard.id);
      toast.success('Board created! API Key available in settings.');
    } catch (error) {
      console.error('Failed to create board:', error);
      toast.error('Failed to create board');
    }
  }, []);

  const handleSelectBoard = useCallback((boardId: string) => {
    setCurrentBoardId(boardId);
    setIsSidebarOpen(false);
  }, []);

  const handleDeleteBoard = useCallback(async (boardId: string) => {
    try {
      await BoardsApiService.delete(boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      
      if (currentBoardId === boardId) {
        const remaining = boards.filter((b) => b.id !== boardId);
        setCurrentBoardId(remaining.length > 0 ? remaining[0].id : null);
        setAgents([]);
      }
      
      toast.success('Board deleted');
    } catch (error) {
      console.error('Failed to delete board:', error);
      toast.error('Failed to delete board');
    }
  }, [currentBoardId, boards]);

  const handleRenameBoard = useCallback(async (name: string) => {
    if (!currentBoardId) return;
    
    try {
      await BoardService.update(currentBoardId, { name });
      setBoards((prev) =>
        prev.map((b) => (b.id === currentBoardId ? { ...b, name } : b))
      );
      toast.success('Board renamed');
    } catch (error) {
      console.error('Failed to rename board:', error);
      toast.error('Failed to rename board');
    }
  }, [currentBoardId]);

  // Convert documents to blocks for Canvas compatibility
  const blocks: Block[] = documents.map((doc, index) => ({
    id: doc.id,
    boardId: currentBoardId || '',
    type: 'doc' as BlockType,
    x: 100 + (index % 3) * 420,
    y: 100 + Math.floor(index / 3) * 320,
    w: 400,
    h: 300,
    z: index + 1,
    data: {
      title: doc.title,
      contentMarkdown: doc.preview,
    },
    createdAt: doc.created_at,
    updatedAt: doc.created_at,
  }));

  const handleAddBlock = useCallback(async (type: BlockType) => {
    if (!currentBoardId) {
      toast.error('Please select a board first');
      return;
    }

    const currentBoard = boards.find(b => b.id === currentBoardId);
    if (!currentBoard?.apiKey) {
      toast.error('Board has no API Key. Create a new board.');
      return;
    }

    // For now, only doc blocks are supported via API
    if (type !== 'doc') {
      toast.info('Only Document blocks are supported in v1. Others coming soon.');
      return;
    }

    try {
      await DocumentService.create(
        currentBoardId,
        currentBoard.apiKey,
        {
          title: 'New Document',
          content: '# New Document\n\nStart typing...',
          author: 'user',
        }
      );

      // Reload documents
      await loadDocuments(currentBoardId);
      toast.success('Document created');
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
    }
  }, [currentBoardId, boards]);

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const handleExport = useCallback(async () => {
    if (!currentBoardId) {
      toast.error('Please select a board first');
      return;
    }

    try {
      const exportData = {
        board: currentBoard,
        documents,
        agents,
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `board-${currentBoard?.name || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Board exported');
    } catch (error) {
      console.error('Failed to export board:', error);
      toast.error('Failed to export board');
    }
  }, [currentBoardId, currentBoard, documents, agents]);

  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Import agents if present
      if (importedData.agents && Array.isArray(importedData.agents)) {
        setAgents(importedData.agents);
      }
      
      const newBoard = await BoardsApiService.create({
        name: `${importedData.board?.name || 'Imported'} (Imported)`,
        description: importedData.board?.description,
      });
      
      setBoards((prev) => [newBoard, ...prev]);
      setCurrentBoardId(newBoard.id);
      toast.success('Board imported! Note: documents not imported (API limitation).');
    } catch (error) {
      console.error('Failed to import board:', error);
      toast.error('Failed to import board. Invalid file format.');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <BoardSelector
          boards={boards}
          currentBoardId={currentBoardId}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <BoardSelector
        boards={boards}
        currentBoardId={currentBoardId}
        onSelectBoard={handleSelectBoard}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        mobileMode={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {currentBoard ? (
          <>
            {/* Mobile Header with Menu Button */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <span className="font-semibold text-gray-800 truncate">{currentBoard.name}</span>
            </div>

            <Toolbar
              boardName={currentBoard.name}
              boardApiKey={currentBoard.apiKey}
              onAddBlock={handleAddBlock}
              onExport={handleExport}
              onImport={handleImport}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={() => handleDeleteBoard(currentBoard.id)}
            />
            <div className="flex-1 min-h-0">
              <Canvas
                board={currentBoard}
                blocks={blocks}
                onBlocksChange={() => { /* no-op for now */ }}
                agents={agents}
                onAgentsChange={setAgents}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-sm">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2">
                Welcome to dockerclaw.app
              </h2>
              <p className="text-gray-500 mb-6">
                Create a new board to get started with your documents
              </p>
              <button
                onClick={() => handleCreateBoard('My First Board')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Board
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
