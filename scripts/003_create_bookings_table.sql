-- Create bookings table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  rentee_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  check_in_date date not null,
  check_out_date date not null,
  total_price numeric(10,2) not null,
  status text check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')) default 'pending',
  payment_status text check (payment_status in ('pending', 'paid', 'refunded')) default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on bookings
alter table public.bookings enable row level security;

-- RLS policies for bookings
create policy "bookings_select_own"
  on public.bookings for select
  using (auth.uid() = rentee_id or auth.uid() = landlord_id);

create policy "bookings_insert_own"
  on public.bookings for insert
  with check (auth.uid() = rentee_id);

create policy "bookings_update_own"
  on public.bookings for update
  using (auth.uid() = rentee_id or auth.uid() = landlord_id);

create policy "bookings_delete_own"
  on public.bookings for delete
  using (auth.uid() = rentee_id or auth.uid() = landlord_id);
