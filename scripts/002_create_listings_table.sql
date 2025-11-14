-- Create listings table for room rentals
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  address text not null,
  city text not null,
  district text not null,
  price numeric(10,2) not null,
  currency text default 'NPR',
  bedrooms integer not null,
  bathrooms integer not null,
  area_sqft integer,
  amenities text[] default '{}',
  photos text[] default '{}',
  availability_status text check (availability_status in ('available', 'occupied', 'maintenance')) default 'available',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true
);

-- Enable RLS on listings
alter table public.listings enable row level security;

-- RLS policies for listings
create policy "listings_select_all"
  on public.listings for select
  using (is_active = true or auth.uid() = landlord_id);

create policy "listings_insert_own"
  on public.listings for insert
  with check (auth.uid() = landlord_id);

create policy "listings_update_own"
  on public.listings for update
  using (auth.uid() = landlord_id);

create policy "listings_delete_own"
  on public.listings for delete
  using (auth.uid() = landlord_id);
