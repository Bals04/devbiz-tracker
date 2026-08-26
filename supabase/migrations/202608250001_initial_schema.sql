create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  role text not null default 'member' check (role in ('admin', 'member')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  name text not null unique check (char_length(trim(name)) between 2 and 100),
  avatar_color text not null check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 150),
  project_name text not null check (char_length(trim(project_name)) between 2 and 180),
  contact_name text,
  contact_email text check (contact_email is null or contact_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  contact_phone text,
  status text not null default 'lead' check (status in ('lead', 'active', 'on_hold', 'completed', 'cancelled')),
  contract_price numeric(14,2) not null default 0 check (contract_price >= 0),
  currency char(3) not null default 'PHP',
  due_date date,
  notes text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_type text not null default 'installment' check (payment_type in ('down_payment', 'installment', 'final', 'refund', 'other')),
  payment_date date not null default current_date,
  reference_number text,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null check (position >= 0),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, name),
  unique (client_id, position),
  unique (client_id, id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  position integer not null default 0 check (position >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (client_id, column_id) references public.kanban_columns(client_id, id) on delete restrict
);

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, team_member_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  entity_type text not null check (entity_type in ('client', 'payment', 'column', 'task', 'comment')),
  entity_id text not null,
  action text not null check (char_length(trim(action)) between 2 and 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index clients_status_idx on public.clients(status) where archived_at is null;
create index clients_search_idx on public.clients using gin (to_tsvector('simple', name || ' ' || project_name || ' ' || coalesce(contact_name, '')));
create index payments_client_date_idx on public.payments(client_id, payment_date desc);
create index columns_client_position_idx on public.kanban_columns(client_id, position);
create index tasks_client_column_position_idx on public.tasks(client_id, column_id, position);
create index tasks_due_date_idx on public.tasks(due_date) where due_date is not null;
create index task_assignees_member_idx on public.task_assignees(team_member_id);
create index task_comments_task_date_idx on public.task_comments(task_id, created_at);
create index activity_logs_client_date_idx on public.activity_logs(client_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger team_members_set_updated_at before update on public.team_members for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger columns_set_updated_at before update on public.kanban_columns for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.task_comments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_default_kanban_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kanban_columns (client_id, name, position, is_completed) values
    (new.id, 'Backlog', 0, false),
    (new.id, 'To Do', 1, false),
    (new.id, 'In Progress', 2, false),
    (new.id, 'For Review', 3, false),
    (new.id, 'Completed', 4, true);
  return new;
end;
$$;

create trigger on_client_created after insert on public.clients for each row execute function public.create_default_kanban_columns();

create or replace function private.is_active_team_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_active = true);
$$;
grant execute on function private.is_active_team_member() to authenticated;

create or replace view public.client_summaries with (security_invoker = true) as
select
  c.*,
  coalesce(financials.total_paid, 0)::numeric(14,2) as total_paid,
  coalesce(financials.down_payment, 0)::numeric(14,2) as down_payment,
  greatest(c.contract_price - coalesce(financials.total_paid, 0), 0)::numeric(14,2) as remaining_balance,
  coalesce(work.task_count, 0)::integer as task_count,
  coalesce(work.completed_task_count, 0)::integer as completed_task_count,
  case when coalesce(work.task_count, 0) = 0 then 0 else round(100.0 * work.completed_task_count / work.task_count) end::integer as progress
from public.clients c
left join lateral (
  select coalesce(sum(case when p.payment_type = 'refund' then -p.amount else p.amount end), 0) as total_paid,
    coalesce(sum(p.amount) filter (where p.payment_type = 'down_payment'), 0) as down_payment
  from public.payments p where p.client_id = c.id
) financials on true
left join lateral (
  select count(*) as task_count,
    count(*) filter (where kc.is_completed) as completed_task_count
  from public.tasks t join public.kanban_columns kc on kc.id = t.column_id
  where t.client_id = c.id
) work on true;

alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.clients enable row level security;
alter table public.payments enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_select_team on public.profiles for select to authenticated using (private.is_active_team_member());
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy team_members_team_all on public.team_members for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy clients_team_all on public.clients for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy payments_team_all on public.payments for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy columns_team_all on public.kanban_columns for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy tasks_team_all on public.tasks for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy assignees_team_all on public.task_assignees for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy comments_team_all on public.task_comments for all to authenticated using (private.is_active_team_member()) with check (private.is_active_team_member());
create policy activity_team_select on public.activity_logs for select to authenticated using (private.is_active_team_member());
create policy activity_team_insert on public.activity_logs for insert to authenticated with check (private.is_active_team_member());

insert into public.team_members (name, avatar_color) values
  ('Erman', '#00DC82'),
  ('Jasmine', '#8B5CF6'),
  ('Jonhyl', '#38BDF8')
on conflict (name) do nothing;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.client_summaries to authenticated;
revoke insert, delete, update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_default_kanban_columns() from public, anon, authenticated;

create index activity_logs_actor_idx on public.activity_logs(actor_id);
create index clients_created_by_idx on public.clients(created_by);
create index payments_recorded_by_idx on public.payments(recorded_by);
create index task_comments_author_idx on public.task_comments(author_id);
create index tasks_column_idx on public.tasks(column_id);
create index tasks_created_by_idx on public.tasks(created_by);
