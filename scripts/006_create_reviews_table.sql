-- Create reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  rating integer check (rating >= 1 and rating <= 5) not null,
  review_text text,
  created_at timestamp with time zone default now()
);

-- Enable RLS on reviews
alter table public.reviews enable row level security;

-- RLS policies for reviews
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = reviewer_id);
