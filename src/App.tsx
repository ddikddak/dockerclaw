// ============================================
// Main App Component - Mobile Responsive
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardService, BlockService, ExportImportService } from '@/services/db';
import { syncService } from '@/services/sync';
import { useAuthContext } from '@/contexts/AuthContext';
import { BoardSelector } from '@/components/BoardSelector';
import { Toolbar } from '@/components/Toolbar';
import { Canvas } from '@/components/Canvas';
import { createDefaultBlockData, DEFAULT_BLOCK_SIZES } from '@/lib/blockDefaults';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Menu } from 'lucide-react';
import type { Board, Block, BlockType, Agent } from '@/types';

function App() {
  const { user } = useAuthContext();
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const prevUserId = useRef<string | null>(null);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  // Start/stop sync on auth change
  useEffect(() => {
    if (user && user.id !== prevUserId.current) {
      prevUserId.current = user.id;
      syncService.start(user);
      // Always reload after pull (new session has empty Dexie)
      syncService.pullFromCloud().then(() => {
        loadBoards();
      });
    } else if (!user && prevUserId.current) {
      prevUserId.current = null;
      syncService.stop();
    }
  }, [user]);

  // Load blocks when current board changes
  useEffect(() => {
    if (currentBoardId) {
      loadBlocks(currentBoardId);
      // Load agents from board settings
      const board = boards.find(b => b.id === currentBoardId);
      if (board?.settings?.agents) {
        setAgents(board.settings.agents);
      } else {
        setAgents([]);
      }
    } else {
      setBlocks([]);
      setAgents([]);
    }
  }, [currentBoardId, boards]);

  // Save agents when they change
  useEffect(() => {
    if (currentBoardId && agents.length >= 0) {
      BoardService.update(currentBoardId, {
        settings: { agents }
      });
    }
  }, [agents, currentBoardId]);

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
      toast.error('Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlocks = async (boardId: string) => {
    try {
      const boardBlocks = await BlockService.getByBoardId(boardId);
      setBlocks(boardBlocks);
    } catch (error) {
      console.error('Failed to load blocks:', error);
      toast.error('Failed to load blocks');
    }
  };

  const handleCreateBoard = useCallback(async (name: string) => {
    try {
      const newBoard = await BoardService.create({
        id: crypto.randomUUID(),
        name,
        canvas: { width: 6000, height: 4000 },
        settings: { agents: [] },
      });
      
      setBoards((prev) => [newBoard, ...prev]);
      setCurrentBoardId(newBoard.id);
      setAgents([]);
      toast.success('Board created');
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
      await BoardService.delete(boardId);
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

  const handleAddBlock = useCallback(async (type: BlockType, x?: number, y?: number) => {
    if (!currentBoardId) {
      toast.error('Please select a board first');
      return;
    }

    try {
      const defaultSize = DEFAULT_BLOCK_SIZES[type];
      const viewportX = 300;
      const viewportY = 200;
      
      const newBlock = await BlockService.create({
        id: crypto.randomUUID(),
        boardId: currentBoardId,
        type,
        x: x ?? viewportX,
        y: y ?? viewportY,
        w: defaultSize.w,
        h: defaultSize.h,
        z: blocks.reduce((max, b) => Math.max(max, b.z || 0), 0) + 1,
        agentAccess: [],
        data: createDefaultBlockData(type) as any,
      });

      setBlocks((prev) => [...prev, newBlock]);
      toast.success(`${type} block added`);
    } catch (error) {
      console.error('Failed to add block:', error);
      toast.error('Failed to add block');
    }
  }, [currentBoardId, blocks.length]);

  const handleAddImageBlock = useCallback(async (x: number, y: number, base64: string, fileName: string) => {
    if (!currentBoardId) return;
    try {
      const defaultSize = DEFAULT_BLOCK_SIZES['image'];
      const newBlock = await BlockService.create({
        id: crypto.randomUUID(),
        boardId: currentBoardId,
        type: 'image',
        x,
        y,
        w: defaultSize.w,
        h: defaultSize.h,
        z: blocks.reduce((max, b) => Math.max(max, b.z || 0), 0) + 1,
        agentAccess: [],
        data: { base64, fileName, caption: '' } as any,
      });
      setBlocks((prev) => [...prev, newBlock]);
    } catch (error) {
      console.error('Failed to add image block:', error);
      toast.error('Failed to add image block');
    }
  }, [currentBoardId, blocks.length]);

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const handleExport = useCallback(async () => {
    if (!currentBoardId) {
      toast.error('Please select a board first');
      return;
    }

    try {
      const jsonData = await ExportImportService.exportBoard(currentBoardId);
      // Add agents to export
      const exportData = JSON.parse(jsonData);
      exportData.agents = agents;
      
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
  }, [currentBoardId, agents, currentBoard?.name]);

  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Import agents if present
      if (importedData.agents && Array.isArray(importedData.agents)) {
        setAgents(importedData.agents);
      }
      
      const importedBoard = await ExportImportService.importBoard(text);
      
      // Update board with agents
      if (importedData.agents) {
        await BoardService.update(importedBoard.id, {
          settings: { agents: importedData.agents }
        });
      }
      
      setBoards((prev) => [importedBoard, ...prev]);
      setCurrentBoardId(importedBoard.id);
      toast.success('Board imported');
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
      <Toaster position="top-right" closeButton toastOptions={{ style: { zIndex: 99999 } }} />
      
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
                onBlocksChange={setBlocks}
                agents={agents}
                onAgentsChange={setAgents}
                onAddImageBlock={handleAddImageBlock}
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
                Create a new board to get started with your draggable blocks
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
