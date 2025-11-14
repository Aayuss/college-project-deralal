-- Create contracts table for rental agreements
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  rentee_id uuid not null references public.profiles(id) on delete cascade,
  contract_pdf_url text,
  terms text,
  landlord_signed_at timestamp with time zone,
  rentee_signed_at timestamp with time zone,
  status text check (status in ('draft', 'pending', 'signed', 'executed')) default 'draft',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on contracts
alter table public.contracts enable row level security;

-- RLS policies for contracts
create policy "contracts_select_own"
  on public.contracts for select
  using (auth.uid() = landlord_id or auth.uid() = rentee_id);

create policy "contracts_insert_own"
  on public.contracts for insert
  with check (auth.uid() = landlord_id or auth.uid() = rentee_id);

create policy "contracts_update_own"
  on public.contracts for update
  using (auth.uid() = landlord_id or auth.uid() = rentee_id);
