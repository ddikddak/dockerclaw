// ============================================
// Share Dialog - Invite collaborators to a board
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Share2, UserPlus, Trash2, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { BoardSharingService } from '@/services/boardSharing';
import type { BoardCollaborator, CollaboratorRole } from '@/types';
import type { PresenceUser } from '@/services/collaboration';

interface ShareDialogProps {
  boardId: string;
  isOwner: boolean;
  onlineUsers?: PresenceUser[];
}

export function ShareDialog({ boardId, isOwner, onlineUsers = [] }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [collaborators, setCollaborators] = useState<BoardCollaborator[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const loadCollaborators = useCallback(async () => {
    try {
      const collabs = await BoardSharingService.getCollaborators(boardId);
      setCollaborators(collabs);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, loadCollaborators]);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsInviting(true);
    try {
      await BoardSharingService.inviteByEmail(boardId, trimmedEmail, role);
      setEmail('');
      toast.success(`Invited ${trimmedEmail}`);
      loadCollaborators();
    } catch (error: any) {
      console.error('Failed to invite:', error);
      toast.error(error.message || 'Failed to invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (collab: BoardCollaborator) => {
    try {
      await BoardSharingService.removeCollaborator(collab.id);
      toast.success(`Removed ${collab.email}`);
      loadCollaborators();
    } catch (error) {
      console.error('Failed to remove:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const handleRoleChange = async (collab: BoardCollaborator, newRole: CollaboratorRole) => {
    try {
      await BoardSharingService.updateRole(collab.id, newRole);
      loadCollaborators();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    }
  };

  const isOnline = (collab: BoardCollaborator) =>
    onlineUsers.some(u => u.userId === collab.userId);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Board</DialogTitle>
          </DialogHeader>

          {/* Invite form (owner only) */}
          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite();
                }}
              />
              <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={isInviting || !email.trim()} size="sm">
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Collaborator list */}
          <div className="space-y-2 mt-2">
            {collaborators.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No collaborators yet. Invite someone by email.
              </p>
            ) : (
              collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50"
                >
                  {/* Online indicator */}
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isOnline(collab) ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />

                  {/* Email */}
                  <span className="flex-1 text-sm truncate">{collab.email}</span>

                  {/* Status/Role badges */}
                  {collab.status === 'pending' ? (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1">
                      {collab.role === 'editor' ? (
                        <Pencil className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Eye className="w-3 h-3 text-gray-400" />
                      )}
                      {isOwner ? (
                        <Select
                          value={collab.role}
                          onValueChange={(v) => handleRoleChange(collab, v as CollaboratorRole)}
                        >
                          <SelectTrigger className="h-6 w-20 text-xs border-none bg-transparent p-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize">{collab.role}</span>
                      )}
                    </div>
                  )}

                  {/* Remove button (owner only) */}
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(collab)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Online users */}
          {onlineUsers.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 mb-2">Online now</p>
              <div className="flex gap-2 flex-wrap">
                {onlineUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{ backgroundColor: u.color + '20', color: u.color }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: u.color }}
                    />
                    {u.email.split('@')[0]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
