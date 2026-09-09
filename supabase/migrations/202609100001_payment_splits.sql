-- Team splits on a recorded payment.
--
-- Rows are applied in `position` order: 15% of the payment, then half of
-- what’s left, and so on. The peso amount is stored so a later change to
-- rounding does not rewrite history. Leftover pesos stay unassigned.

create table public.payment_splits (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete restrict,
  basis text not null check (basis in ('payment', 'remaining')),
  percent numeric(8,4) not null check (percent > 0 and percent <= 100),
  amount numeric(14,2) not null check (amount >= 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (payment_id, team_member_id),
  unique (payment_id, position)
);

create index payment_splits_payment_idx on public.payment_splits(payment_id, position);
create index payment_splits_member_idx on public.payment_splits(team_member_id);

alter table public.payment_splits enable row level security;

create policy payment_splits_team_all on public.payment_splits
  for all to authenticated
  using (private.is_active_team_member())
  with check (private.is_active_team_member());

grant select, insert, update, delete on public.payment_splits to authenticated;
