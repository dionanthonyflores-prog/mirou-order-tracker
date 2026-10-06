-- mirou matcha order tracker: the database tables and the privacy rules.
-- Run this once in Supabase: SQL Editor → New query → paste everything → Run.
-- It is safe to read: it contains no passwords, keys or customer data.

-- ===== Orders =====
-- One row per order. The drinks are stored inside the order (items), each with the price it was sold at.
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  no            integer not null,                                   -- order number she sees, e.g. #107 (set automatically)
  created_at    timestamptz not null default now(),
  customer      text not null check (length(trim(customer)) > 0),
  contact       text not null default '',
  how           text not null check (how in ('pickup', 'delivery')),
  address       text not null default '',
  delivery_fee  integer not null default 0 check (delivery_fee >= 0),
  notes         text not null default '',
  status        text not null default 'new'
                check (status in ('new', 'preparing', 'out', 'ready', 'done', 'cancelled')),
  paid          boolean not null default false,
  paid_by       text check (paid_by in ('cash', 'gcash', 'bank')),
  items         jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),

  -- The same rules the app checks, enforced by the database too
  constraint delivery_needs_address check (how = 'pickup' or length(trim(address)) > 0),
  constraint paid_means_method      check (paid = (paid_by is not null)),
  constraint out_only_for_delivery  check (status <> 'out' or how = 'delivery'),
  constraint ready_only_for_pickup  check (status <> 'ready' or how = 'pickup'),
  constraint one_number_per_order   unique (owner_id, no)
);

-- Order numbers: the next one after her highest (the first order is #101)
create function public.set_order_no() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.no is null then
    select coalesce(max(o.no), 100) + 1 into new.no from public.orders o where o.owner_id = new.owner_id;
  end if;
  return new;
end $$;

create trigger set_order_no before insert on public.orders
  for each row execute function public.set_order_no();

-- ===== Privacy: only the logged-in owner can see or change her own orders =====
alter table public.orders enable row level security;

create policy "Owner can read her orders"   on public.orders for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Owner can add orders"        on public.orders for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owner can update her orders" on public.orders for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
-- No delete rule on purpose: orders are cancelled, never deleted.

-- Belt and braces: visitors who are not logged in get no access to orders at all, even if a rule above were removed by mistake
revoke all on table public.orders from anon;

-- ===== Keep-awake =====
-- Free Supabase projects pause after a week without use. A daily automatic call to this harmless function
-- keeps the project awake during quiet weeks. It returns the word 'ok' and reads no data.
create function public.ping() returns text
language sql stable set search_path = '' as $$ select 'ok'::text $$;
grant execute on function public.ping() to anon;
