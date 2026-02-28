import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { AgentApiKeyRef, Board } from '@/types';

type ApiPermission = 'read' | 'write' | 'delete';

interface AgentApiRow {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiPermission[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  description: string | null;
  agent_id: string | null;
}

interface AgentApiSettingsProps {
  boardId: string;
  boardSettings?: Board['settings'];
  onUpdateBoardSettings: (updates: Partial<NonNullable<Board['settings']>>) => Promise<void>;
}

const orderedPermissions: ApiPermission[] = ['read', 'write', 'delete'];

function toSettingsRef(row: AgentApiRow): AgentApiKeyRef {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    permissions: row.permissions,
    isActive: row.is_active,
    createdAt: row.created_at,
    description: row.description ?? undefined,
    agentId: row.agent_id ?? undefined,
  };
}

export function AgentApiSettings({ boardId, boardSettings, onUpdateBoardSettings }: AgentApiSettingsProps) {
  const [apiKeys, setApiKeys] = useState<AgentApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingKeyId, setUpdatingKeyId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<ApiPermission[]>(['read', 'write']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const canCreate = useMemo(
    () => agentName.trim().length > 0 && permissions.length > 0,
    [agentName, permissions]
  );

  const syncSettingsKeys = useCallback(async (rows: AgentApiRow[]) => {
    const mapped = rows.map(toSettingsRef);
    const existing = boardSettings?.agentApiKeys ?? [];
    const unchanged = JSON.stringify(existing) === JSON.stringify(mapped);
    if (!unchanged) {
      await onUpdateBoardSettings({ agentApiKeys: mapped });
    }
  }, [boardSettings?.agentApiKeys, onUpdateBoardSettings]);

  const loadKeys = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_api_keys')
      .select('id, name, key_prefix, permissions, is_active, created_at, last_used_at, description, agent_id')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load agent API keys');
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AgentApiRow[];
    setApiKeys(rows);
    await syncSettingsKeys(rows);
    setLoading(false);
  }, [boardId, syncSettingsKeys]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const togglePermission = (permission: ApiPermission, checked: boolean) => {
    setPermissions((prev) => {
      if (checked) {
        return prev.includes(permission) ? prev : [...prev, permission];
      }
      return prev.filter((value) => value !== permission);
    });
  };

  const handleCreateKey = async () => {
    if (!supabase) {
      toast.error('Supabase is not configured');
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) {
      toast.error('Missing VITE_SUPABASE_URL');
      return;
    }

    const { data: authData } = await supabase.auth.getSession();
    const token = authData.session?.access_token;
    if (!token) {
      toast.error('You need to be signed in to create API keys');
      return;
    }

    setCreating(true);
    const response = await fetch(`${supabaseUrl}/functions/v1/agent-generate-key`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: boardId,
        name: agentName.trim(),
        permissions,
        description: description.trim() || null,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload?.error ?? 'Failed to generate API key');
      setCreating(false);
      return;
    }

    setCreatedKey(payload.key);
    setAgentName('');
    setDescription('');
    setPermissions(['read', 'write']);
    toast.success('Agent API key created');
    await loadKeys();
    setCreating(false);
  };

  const handleToggleKeyActive = async (row: AgentApiRow) => {
    if (!supabase) return;
    setUpdatingKeyId(row.id);
    const { error } = await supabase
      .from('agent_api_keys')
      .update({ is_active: !row.is_active })
      .eq('id', row.id)
      .eq('board_id', boardId);

    if (error) {
      toast.error('Failed to update key status');
      setUpdatingKeyId(null);
      return;
    }

    await loadKeys();
    toast.success(row.is_active ? 'API key disabled' : 'API key enabled');
    setUpdatingKeyId(null);
  };

  return (
    <div className="pt-4 border-t border-gray-200 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900">Agent API</h3>
        <p className="text-xs text-gray-500 mt-1">
          Create API keys for external agents. Keys are shown only once.
        </p>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Agent name (e.g. Planning Assistant)"
          value={agentName}
          onChange={(event) => setAgentName(event.target.value)}
        />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="flex flex-wrap gap-3">
          {orderedPermissions.map((permission) => (
            <label key={permission} className="inline-flex items-center gap-2 text-sm text-gray-700">
              <Checkbox
                checked={permissions.includes(permission)}
                onCheckedChange={(checked) => togglePermission(permission, Boolean(checked))}
              />
              {permission}
            </label>
          ))}
        </div>

        <Button onClick={handleCreateKey} disabled={!canCreate || creating}>
          {creating ? 'Creating key...' : 'Create API key'}
        </Button>
      </div>

      {createdKey && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-xs text-amber-900">Save this key now. You will not be able to see it again.</p>
          <code className="block text-xs bg-white border rounded p-2 break-all">{createdKey}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(createdKey);
              toast.success('API key copied');
            }}
          >
            Copy key
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {loading && <p className="text-xs text-gray-500">Loading keys...</p>}
        {!loading && apiKeys.length === 0 && (
          <p className="text-xs text-gray-500">No API keys created yet.</p>
        )}
        {apiKeys.map((row) => (
          <div key={row.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.name}</p>
                <p className="text-xs text-gray-500">
                  Prefix: <code>{row.key_prefix}</code>
                </p>
                {row.description && <p className="text-xs text-gray-500">{row.description}</p>}
              </div>
              <Badge variant={row.is_active ? 'default' : 'secondary'}>
                {row.is_active ? 'active' : 'disabled'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1">
              {row.permissions.map((permission) => (
                <Badge key={permission} variant="outline">{permission}</Badge>
              ))}
            </div>

            <p className="text-[11px] text-gray-500">
              Last used: {row.last_used_at ? new Date(row.last_used_at).toLocaleString() : 'never'}
            </p>

            <Button
              variant="outline"
              size="sm"
              disabled={updatingKeyId === row.id}
              onClick={() => handleToggleKeyActive(row)}
            >
              {row.is_active ? 'Disable key' : 'Enable key'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

