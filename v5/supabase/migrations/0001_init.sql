-- Launch Command v5 — schema + Row Level Security
-- Run in the Supabase SQL editor, or: supabase db push

-- ── profiles ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','agency')),
  generations_used_this_month int not null default 0,
  usage_period_start date not null default date_trunc('month', now())::date,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- ── campaigns ───────────────────────────────────────────────────
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  category text,
  price text,
  offer text,
  core_problem text,
  usp text,
  target_audience text,
  brand_tone text,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_user_idx on public.campaigns(user_id);

-- ── generations ─────────────────────────────────────────────────
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  page_type text not null,
  content jsonb not null,
  tokens_used int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists generations_campaign_idx on public.generations(campaign_id);

-- ── kanban_tasks ────────────────────────────────────────────────
create table if not exists public.kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text,
  column_key text not null default 'todo' check (column_key in ('todo','in_progress','done')),
  position int not null default 0
);
create index if not exists kanban_campaign_idx on public.kanban_tasks(campaign_id);

-- ── auto-create a profile on signup ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── atomic monthly usage increment (rolls over each month) ───────
create or replace function public.increment_generations(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set
    generations_used_this_month = case
      when usage_period_start < date_trunc('month', now())::date then 1
      else generations_used_this_month + 1 end,
    usage_period_start = date_trunc('month', now())::date
  where id = p_user_id;
end $$;

-- ── Row Level Security: users see ONLY their own data ────────────
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.generations enable row level security;
alter table public.kanban_tasks enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own campaigns" on public.campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own generations" on public.generations
  for all using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );

create policy "own kanban" on public.kanban_tasks
  for all using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
