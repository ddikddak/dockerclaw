-- ============================================
-- DockerClaw: Clean slate + create tables
-- ============================================

-- Drop ALL existing public tables (CASCADE handles FKs, policies, triggers)
do $$
declare
  r record;
begin
  for r in (
    select tablename from pg_tables where schemaname = 'public'
  ) loop
    execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
  end loop;
end $$;

-- Drop leftover functions
drop function if exists public.handle_updated_at() cascade;

-- ============================================
-- Boards
-- ============================================
create table public.boards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  canvas jsonb,
  settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_boards_user_id on public.boards(user_id);

-- ============================================
-- Blocks
-- ============================================
create table public.blocks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  type text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  w double precision not null default 300,
  h double precision not null default 200,
  z integer default 0,
  locked boolean default false,
  agent_access text[],
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_blocks_board_id on public.blocks(board_id);
create index idx_blocks_user_id on public.blocks(user_id);

-- ============================================
-- API Permissions (required for PostgREST / new publishable keys)
-- ============================================
grant usage on schema public to anon, authenticated;
grant all on public.boards to anon, authenticated;
grant all on public.blocks to anon, authenticated;

-- ============================================
-- Row-Level Security
-- ============================================
alter table public.boards enable row level security;
alter table public.blocks enable row level security;

create policy "Users CRUD own boards"
  on public.boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users CRUD own blocks"
  on public.blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- Auto-update timestamps
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger boards_updated_at
  before update on public.boards
  for each row execute function public.handle_updated_at();

create trigger blocks_updated_at
  before update on public.blocks
  for each row execute function public.handle_updated_at();
