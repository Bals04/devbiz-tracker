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

revoke insert, delete, update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
