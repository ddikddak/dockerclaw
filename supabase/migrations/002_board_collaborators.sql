-- ============================================
-- DockerClaw: Board Collaborators + Updated RLS
-- ============================================

-- ============================================
-- Board Collaborators Table
-- ============================================
create table public.board_collaborators (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_collab_board on public.board_collaborators(board_id);
create index idx_collab_user on public.board_collaborators(user_id);
create index idx_collab_email on public.board_collaborators(email);

-- ============================================
-- RLS for board_collaborators
-- ============================================
alter table public.board_collaborators enable row level security;

create policy "Users see own collaborations"
  on public.board_collaborators for select
  using (
    auth.uid() = user_id
    OR email = auth.jwt()->>'email'
    OR auth.uid() = invited_by
  );

create policy "Owners manage collaborators"
  on public.board_collaborators for insert
  with check (auth.uid() = invited_by);

create policy "Owners update collaborators"
  on public.board_collaborators for update
  using (auth.uid() = invited_by);

create policy "Owners delete collaborators"
  on public.board_collaborators for delete
  using (auth.uid() = invited_by);

-- Collaborators can accept their own invites
-- using: pre-check (row must be pending + match email)
-- with check: post-check (email still matches, status can be 'accepted')
create policy "Users accept own invites"
  on public.board_collaborators for update
  using (email = auth.jwt()->>'email' AND status = 'pending')
  with check (email = auth.jwt()->>'email');

grant all on public.board_collaborators to authenticated;

-- Auto-update timestamp
create trigger collab_updated_at
  before update on public.board_collaborators
  for each row execute function public.handle_updated_at();

-- ============================================
-- Updated Boards RLS (owner + collaborators)
-- ============================================
drop policy if exists "Users CRUD own boards" on public.boards;

create policy "Owner or collaborator reads boards"
  on public.boards for select
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = id
        AND (
          (bc.user_id = auth.uid() AND bc.status = 'accepted')
          OR (bc.email = auth.jwt()->>'email' AND bc.status = 'pending')
        )
    )
  );

create policy "Owner inserts boards"
  on public.boards for insert
  with check (auth.uid() = user_id);

create policy "Owner or editor updates boards"
  on public.boards for update
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
        AND bc.role = 'editor'
    )
  );

create policy "Owner deletes boards"
  on public.boards for delete
  using (auth.uid() = user_id);

-- ============================================
-- Updated Blocks RLS (owner + collaborators)
-- ============================================
drop policy if exists "Users CRUD own blocks" on public.blocks;

create policy "Owner or collaborator reads blocks"
  on public.blocks for select
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = blocks.board_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
    )
  );

create policy "Owner or editor inserts blocks"
  on public.blocks for insert
  with check (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = board_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
        AND bc.role = 'editor'
    )
  );

create policy "Owner or editor updates blocks"
  on public.blocks for update
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = blocks.board_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
        AND bc.role = 'editor'
    )
  );

create policy "Owner or editor deletes blocks"
  on public.blocks for delete
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.board_collaborators bc
      where bc.board_id = blocks.board_id
        AND bc.user_id = auth.uid()
        AND bc.status = 'accepted'
        AND bc.role = 'editor'
    )
  );

-- ============================================
-- Realtime for collaborators
-- ============================================
alter publication supabase_realtime add table public.board_collaborators;
