// ============================================
// Main App Component - Mobile Responsive
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BoardService, BlockService } from '@/services/db';
import { syncService, hasLocalData } from '@/services/sync';
import { SyncChoiceDialog, type SyncChoice } from '@/components/SyncChoiceDialog';
import { db } from '@/services/db';
import { BoardSharingService, SharedBlockService } from '@/services/boardSharing';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { BoardSelector } from '@/components/BoardSelector';
import { Toolbar } from '@/components/Toolbar';
import { Canvas, type CanvasHandle } from '@/components/Canvas';
import { createDefaultBlockData, DEFAULT_BLOCK_SIZES } from '@/lib/blockDefaults';
import { mapRemoteBlock } from '@/lib/mappers';
import { logger } from '@/lib/logger';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { Board, Block, BlockType, BlockPurpose, Agent, Connection, BoardPermission, BoardCollaborator, ImageBlockData, InboxBlockData } from '@/types';
import type { PresenceUser } from '@/services/collaboration';

interface SharedBoard {
  board: Board;
  collaborator: BoardCollaborator;
  ownerId: string;
}

function App() {
  const { user } = useAuthContext();
  const [boards, setBoards] = useState<Board[]>([]);
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [pendingInvites, setPendingInvites] = useState<BoardCollaborator[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [localBoardCount, setLocalBoardCount] = useState(0);
  const prevUserId = useRef<string | null>(null);
  const currentBoardIdRef = useRef<string | null>(null);
  const canvasRef = useRef<CanvasHandle>(null);

  // Warn before leaving when a board is open
  useEffect(() => {
    if (!currentBoardId) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentBoardId]);

  // Determine current board permission
  const getCurrentPermission = useCallback((): BoardPermission => {
    if (!currentBoardId || !user) return 'owner';
    // Check if it's an owned board
    const ownedBoard = boards.find(b => b.id === currentBoardId);
    if (ownedBoard) return 'owner';
    // Check shared boards
    const shared = sharedBoards.find(sb => sb.board.id === currentBoardId);
    if (shared) return shared.collaborator.role === 'editor' ? 'editor' : 'viewer';
    return 'owner';
  }, [currentBoardId, user, boards, sharedBoards]);

  // Keep ref in sync so the realtime callback always has the latest board ID
  useEffect(() => {
    currentBoardIdRef.current = currentBoardId;
  }, [currentBoardId]);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  // Start/stop sync on auth change
  useEffect(() => {
    if (user && user.id !== prevUserId.current) {
      prevUserId.current = user.id;
      syncService.onRemoteChange(async (table) => {
        if (table === 'boards') {
          await loadBoards();
          const boardId = currentBoardIdRef.current;
          if (boardId) {
            const board = await BoardService.getById(boardId);
            if (board?.settings?.agents) setAgents(board.settings.agents);
            if (board?.settings?.connections) setConnections(board.settings.connections);
          }
        } else {
          const boardId = currentBoardIdRef.current;
          if (boardId) loadBlocks(boardId);
        }
      });

      // Start realtime only (no push yet — wait for user choice if needed)
      syncService.startRealtimeOnly(user);

      // Check if we need to show the sync choice dialog
      const alreadySynced = !!localStorage.getItem('dockerclaw_lastSyncedAt');
      hasLocalData().then(async (hasLocal) => {
        if (hasLocal && !alreadySynced) {
          // First time sign-in with local data — ask user what to do
          const count = await db.boards.count();
          setLocalBoardCount(count);
          setSyncDialogOpen(true);
        } else {
          // No dialog needed — silently push (if data exists) + pull
          if (hasLocal) {
            await syncService.pushAllAndFlush();
          }
          await syncService.pullFromCloud();
          loadBoards();
        }
      });

      loadSharedBoards();
    } else if (!user && prevUserId.current) {
      prevUserId.current = null;
      syncService.stop();

      // Clear all local data so sign-out behaves like a fresh browser
      db.boards.clear();
      db.blocks.clear();
      db._syncQueue.clear();
      localStorage.removeItem('dockerclaw_lastSyncedAt');

      // Reset all in-memory state
      setBoards([]);
      setBlocks([]);
      setCurrentBoardId(null);
      setSharedBoards([]);
      setPendingInvites([]);
      setSyncDialogOpen(false);
      setConnections([]);
      setAgents([]);
      setOnlineUsers([]);
    }
  }, [user]);

  // Memoize shared boards list for BoardSelector (avoids .map on every render)
  const sharedBoardsList = useMemo(
    () => sharedBoards.map(sb => sb.board),
    [sharedBoards]
  );

  // Memoize allBoards to avoid recreating array on every render
  const allBoards = useMemo(
    () => [...boards, ...sharedBoards.map(sb => sb.board)],
    [boards, sharedBoards]
  );

  // Memoize board lookup map for O(1) access
  const boardsById = useMemo(
    () => new Map(allBoards.map(b => [b.id, b])),
    [allBoards]
  );

  // Load blocks when current board changes
  useEffect(() => {
    if (currentBoardId) {
      loadBlocks(currentBoardId);
      const board = boardsById.get(currentBoardId);
      setAgents(board?.settings?.agents || []);
      setConnections(board?.settings?.connections || []);
    } else {
      setBlocks([]);
      setAgents([]);
      setConnections([]);
    }
  }, [currentBoardId, boardsById]);

  // Poll for remote block changes (fallback when realtime WebSocket is down)
  // Also re-fetches on tab visibility change
  useEffect(() => {
    if (!user || !supabase) return;
    const poll = () => {
      const boardId = currentBoardIdRef.current;
      if (boardId && document.visibilityState === 'visible') loadBlocks(boardId);
    };
    const interval = setInterval(poll, 10_000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [user]);

  // Save agents + connections together to avoid settings race condition
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentBoardId || getCurrentPermission() === 'viewer') return;
    // Debounce settings saves to batch agents + connections changes
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(() => {
      const board = boardsById.get(currentBoardId);
      BoardService.update(currentBoardId, {
        settings: { ...board?.settings, agents, connections }
      });
    }, 300);
    return () => { if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current); };
  }, [agents, connections, currentBoardId, getCurrentPermission, boardsById]);

  // Subscribe to shared board block changes via Realtime
  const sharedBlockReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentBoardId || !supabase || !user) return;
    const isShared = sharedBoards.some(sb => sb.board.id === currentBoardId);
    if (!isShared) return;

    const channel = supabase
      .channel(`shared-blocks:${currentBoardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `board_id=eq.${currentBoardId}` },
        () => {
          // Debounce reload to avoid flicker during rapid updates
          if (sharedBlockReloadTimer.current) {
            clearTimeout(sharedBlockReloadTimer.current);
          }
          sharedBlockReloadTimer.current = setTimeout(() => {
            loadBlocks(currentBoardId);
          }, 200);
        }
      )
      .subscribe();

    return () => {
      if (sharedBlockReloadTimer.current) {
        clearTimeout(sharedBlockReloadTimer.current);
      }
      supabase?.removeChannel(channel);
    };
  }, [currentBoardId, sharedBoards, user]);

  const loadBoards = async () => {
    try {
      const allBoards = await BoardService.getAll();
      setBoards(allBoards);

      // Select first board if none selected (use ref to avoid stale closure)
      if (allBoards.length > 0 && !currentBoardIdRef.current) {
        setCurrentBoardId(allBoards[0].id);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
      toast.error('Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSharedBoards = async () => {
    try {
      const [shared, invites] = await Promise.all([
        BoardSharingService.getSharedBoards(),
        BoardSharingService.getPendingInvites(),
      ]);
      logger.info('app', `loadSharedBoards: ${shared.length} shared, ${invites.length} pending`);
      setSharedBoards(shared.map(s => ({
        board: s.board,
        collaborator: s.collaborator,
        ownerId: s.ownerId,
      })));
      setPendingInvites(invites);
    } catch (error) {
      console.error('Failed to load shared boards:', error);
    }
  };

  const loadBlocks = async (boardId: string) => {
    try {
      // Check if it's a shared board (blocks from Supabase, not Dexie)
      const isShared = sharedBoards.some(sb => sb.board.id === boardId);
      if (isShared && supabase) {
        const { data, error } = await supabase
          .from('blocks')
          .select('*')
          .eq('board_id', boardId)
          .is('deleted_at', null);
        if (error) throw error;
        const mappedBlocks: Block[] = (data || []).map(mapRemoteBlock);
        setBlocks(mappedBlocks);
      } else {
        const boardBlocks = await BlockService.getByBoardId(boardId);
        setBlocks(boardBlocks);

        // Background sync: merge remote state as source of truth for API changes
        if (supabase && user) {
          (async () => {
            try {
              const { data: remoteBlocks, error: remoteErr } = await supabase
                .from('blocks')
                .select('*')
                .eq('board_id', boardId)
                .eq('user_id', user.id)
                .is('deleted_at', null);
              if (remoteErr) { console.warn('[sync] bg fetch error:', remoteErr); return; }
              if (!remoteBlocks) return;

              // Always merge remote into Dexie - remote is source of truth
              const mapped = remoteBlocks.map((r: Record<string, unknown>) => mapRemoteBlock(r));
              const remoteIds = new Set(mapped.map(b => b.id));

              // Log inbox blocks data for debugging
              const inboxBlocks = mapped.filter(b => b.type === 'inbox');
              if (inboxBlocks.length > 0) {
                for (const ib of inboxBlocks) {
                  const localBlock = boardBlocks.find(b => b.id === ib.id);
                  const remoteItems = (ib.data as InboxBlockData)?.items?.length || 0;
                  const localItems = localBlock ? ((localBlock.data as InboxBlockData)?.items?.length || 0) : -1;
                  console.warn(`[sync] inbox ${ib.id}: remote=${remoteItems} items, local=${localItems} items`);
                }
              }

              // Check if anything actually changed before updating state
              const localById = new Map(boardBlocks.map(b => [b.id, b]));
              const hasChanges = mapped.some(remote => {
                const local = localById.get(remote.id);
                return !local || JSON.stringify(local.data) !== JSON.stringify(remote.data)
                  || new Date(remote.updatedAt).getTime() !== new Date(local.updatedAt).getTime();
              });
              const staleDeleted = boardBlocks.filter(b => !remoteIds.has(b.id));

              if (!hasChanges && staleDeleted.length === 0) return;
              console.warn(`[sync] bg: changes detected, refreshing UI`);

              await db.blocks.bulkPut(mapped);
              if (staleDeleted.length > 0) {
                await db.blocks.bulkDelete(staleDeleted.map(b => b.id));
              }
              const refreshed = await BlockService.getByBoardId(boardId);
              setBlocks(refreshed);
            } catch (err: unknown) {
              console.warn('[app] background sync failed:', err);
            }
          })();
        }
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
      toast.error('Failed to load blocks');
    }
  };

  const handleAcceptInvite = useCallback(async (invite: BoardCollaborator) => {
    try {
      await BoardSharingService.acceptInvite(invite.id);
      toast.success('Invitation accepted');
      await loadSharedBoards();
      // Auto-navigate to the accepted board
      if (invite.boardId) {
        setCurrentBoardId(invite.boardId);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      toast.error('Failed to accept invitation');
    }
  }, []);

  const handleSyncChoice = useCallback(async (choice: SyncChoice) => {
    if (choice === 'upload') {
      await syncService.pushAllAndFlush();
      await syncService.pullFromCloud();
    } else {
      await syncService.clearLocalAndPullFresh();
    }
    setSyncDialogOpen(false);
    loadBoards();
  }, []);

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

  const handleUpdateBoardSettings = useCallback(async (updates: Partial<NonNullable<Board['settings']>>) => {
    if (!currentBoardId) return;

    const board = boardsById.get(currentBoardId);
    const nextSettings = { ...(board?.settings || {}), ...updates };

    await BoardService.update(currentBoardId, { settings: nextSettings });
    setBoards((prev) =>
      prev.map((item) => (
        item.id === currentBoardId
          ? { ...item, settings: nextSettings }
          : item
      ))
    );
  }, [boardsById, currentBoardId]);

  const handleBlockMetaUpdate = useCallback(async (blockId: string, updates: { description?: string; purpose?: BlockPurpose; semanticTags?: string[] }) => {
    if (!currentBoardId) return;
    const shared = sharedBoards.find(sb => sb.board.id === currentBoardId);
    const now = new Date().toISOString();

    if (shared) {
      await SharedBlockService.update(blockId, updates);
    } else {
      await BlockService.update(blockId, updates);
    }

    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, ...updates, updatedAt: now } : b
    ));
  }, [currentBoardId, sharedBoards]);

  const handleAddBlock = useCallback(async (type: BlockType, x?: number, y?: number) => {
    if (!currentBoardId) {
      toast.error('Please select a board first');
      return;
    }

    try {
      const defaultSize = DEFAULT_BLOCK_SIZES[type];
      const center = canvasRef.current?.getViewportCenter();
      const viewportX = center?.x ?? 300;
      const viewportY = center?.y ?? 200;
      const shared = sharedBoards.find(sb => sb.board.id === currentBoardId);

      const blockData = {
        id: crypto.randomUUID(),
        boardId: currentBoardId,
        type,
        x: x ?? viewportX,
        y: y ?? viewportY,
        w: defaultSize.w,
        h: defaultSize.h,
        z: blocks.reduce((max, b) => Math.max(max, b.z || 0), 0) + 1,
        agentAccess: [],
        data: createDefaultBlockData(type),
      };

      const newBlock = shared
        ? await SharedBlockService.create(blockData)
        : await BlockService.create(blockData);

      setBlocks((prev) => [...prev, newBlock]);
      setFocusBlockId(newBlock.id);
      toast.success(`${type} block added`);
    } catch (error) {
      console.error('Failed to add block:', error);
      toast.error('Failed to add block');
    }
  }, [currentBoardId, blocks.length, sharedBoards]);

  const handleAddImageBlock = useCallback(async (x: number, y: number, base64: string, fileName: string) => {
    if (!currentBoardId) return;
    try {
      const defaultSize = DEFAULT_BLOCK_SIZES['image'];
      const shared = sharedBoards.find(sb => sb.board.id === currentBoardId);

      const blockData = {
        id: crypto.randomUUID(),
        boardId: currentBoardId,
        type: 'image' as BlockType,
        x,
        y,
        w: defaultSize.w,
        h: defaultSize.h,
        z: blocks.reduce((max, b) => Math.max(max, b.z || 0), 0) + 1,
        agentAccess: [],
        data: { base64, fileName, caption: '' } as ImageBlockData,
      };

      const newBlock = shared
        ? await SharedBlockService.create(blockData)
        : await BlockService.create(blockData);

      setBlocks((prev) => [...prev, newBlock]);
    } catch (error) {
      console.error('Failed to add image block:', error);
      toast.error('Failed to add image block');
    }
  }, [currentBoardId, blocks.length, sharedBoards]);

  const currentBoard = boardsById.get(currentBoardId ?? '');
  const currentPermission = getCurrentPermission();
  // Enable collaboration when user is signed in (cursors only appear when others join)
  const isCollaborative = !!user && !!currentBoardId;
  const currentSharedBoard = sharedBoards.find(sb => sb.board.id === currentBoardId);
  const isSharedBoard = !!currentSharedBoard;
  const boardOwnerId = currentSharedBoard?.ownerId;


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
      <SyncChoiceDialog
        open={syncDialogOpen}
        onChoice={handleSyncChoice}
        localBoardCount={localBoardCount}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <BoardSelector
          boards={boards}
          sharedBoards={sharedBoardsList}
          pendingInvites={pendingInvites}
          currentBoardId={currentBoardId}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={handleCreateBoard}
          onDeleteBoard={handleDeleteBoard}
          onAcceptInvite={handleAcceptInvite}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <BoardSelector
        boards={boards}
        sharedBoards={sharedBoardsList}
        pendingInvites={pendingInvites}
        currentBoardId={currentBoardId}
        onSelectBoard={handleSelectBoard}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        onAcceptInvite={handleAcceptInvite}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        mobileMode={true}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {currentBoard ? (
          <>
            <Toolbar
              boardName={currentBoard.name}
              boardId={currentBoard.id}
              permission={currentPermission}
              onAddBlock={handleAddBlock}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={() => handleDeleteBoard(currentBoard.id)}
              onlineUsers={onlineUsers}
              agents={agents}
              onOpenAgentDialog={() => setIsAgentDialogOpen(true)}
              blocks={blocks}
              onFocusBlock={(blockId) => setFocusBlockId(blockId)}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              boardSettings={currentBoard.settings}
              onUpdateBoardSettings={currentPermission === 'owner' ? handleUpdateBoardSettings : undefined}
              onBlockMetaUpdate={currentPermission === 'owner' ? handleBlockMetaUpdate : undefined}
            />
            <div className="flex-1 min-h-0">
              <Canvas
                ref={canvasRef}
                board={currentBoard}
                blocks={blocks}
                onBlocksChange={setBlocks}
                agents={agents}
                onAgentsChange={setAgents}
                onAddImageBlock={handleAddImageBlock}
                permission={currentPermission}
                isCollaborative={isCollaborative}
                isSharedBoard={isSharedBoard}
                boardOwnerId={boardOwnerId}
                onOnlineUsersChange={setOnlineUsers}
                isAgentDialogOpen={isAgentDialogOpen}
                onAgentDialogOpenChange={setIsAgentDialogOpen}
                focusBlockId={focusBlockId}
                onFocusBlockHandled={() => setFocusBlockId(null)}
                connections={connections}
                onConnectionsChange={setConnections}
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
