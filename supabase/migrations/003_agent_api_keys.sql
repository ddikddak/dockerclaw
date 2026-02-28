-- ============================================
-- Agent API Keys for Edge Functions access
-- ============================================

create table public.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text,
  name text not null default 'Agent Key',
  description text,
  key_hash text not null unique,  -- SHA-256 hash of the key
  key_prefix text not null,       -- First 8 chars for display
  permissions jsonb not null default '["read", "write"]',  -- ["read", "write", "delete"]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  is_active boolean not null default true
);

create index idx_agent_api_keys_board_id on public.agent_api_keys(board_id);
create index idx_agent_api_keys_key_hash on public.agent_api_keys(key_hash);
create index idx_agent_api_keys_board_agent on public.agent_api_keys(board_id, agent_id);

-- RLS: Users can manage their own API keys
alter table public.agent_api_keys enable row level security;

create policy "Users CRUD own agent API keys"
  on public.agent_api_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger agent_api_keys_updated_at
  before update on public.agent_api_keys
  for each row execute function public.handle_updated_at();

-- Grant access for Edge Functions (service_role)
grant all on public.agent_api_keys to service_role;
grant all on public.blocks to service_role;
grant all on public.boards to service_role;

-- Need pgcrypto extension for digest function
create extension if not exists pgcrypto;

-- ============================================
-- Helper function to validate API key
-- ============================================
create or replace function public.validate_agent_api_key(api_key text, board_uuid uuid)
returns table (
  is_valid boolean,
  permissions jsonb,
  user_id uuid
) as $$
declare
  key_hash text;
begin
  -- Calculate SHA-256 hash
  key_hash := encode(digest(api_key, 'sha256'), 'hex');
  
  return query
  select 
    true as is_valid,
    aak.permissions,
    aak.user_id
  from public.agent_api_keys aak
  where aak.key_hash = key_hash
    and aak.board_id = board_uuid
    and aak.is_active = true;
    
  -- If no match, return false
  if not found then
    return query select false, '[]'::jsonb, null::uuid;
  end if;
end;
$$ language plpgsql security definer;
