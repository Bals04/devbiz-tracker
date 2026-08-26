create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_active_team_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_active = true);
$$;
grant execute on function private.is_active_team_member() to authenticated;

drop policy if exists profiles_select_team on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists team_members_team_all on public.team_members;
drop policy if exists clients_team_all on public.clients;
drop policy if exists payments_team_all on public.payments;
drop policy if exists columns_team_all on public.kanban_columns;
drop policy if exists tasks_team_all on public.tasks;
drop policy if exists assignees_team_all on public.task_assignees;
drop policy if exists comments_team_all on public.task_comments;
drop policy if exists activity_team_select on public.activity_logs;
drop policy if exists activity_team_insert on public.activity_logs;

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

drop function if exists public.is_active_team_member();
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_default_kanban_columns() from public, anon, authenticated;

create index if not exists activity_logs_actor_idx on public.activity_logs(actor_id);
create index if not exists clients_created_by_idx on public.clients(created_by);
create index if not exists payments_recorded_by_idx on public.payments(recorded_by);
create index if not exists task_comments_author_idx on public.task_comments(author_id);
create index if not exists tasks_column_idx on public.tasks(column_id);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
