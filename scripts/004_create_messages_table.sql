-- Create messages table for real-time chat
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text check (message_type in ('text', 'warning', 'notification')) default 'text',
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS on messages
alter table public.messages enable row level security;

-- RLS policies for messages
create policy "messages_select_own"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages_insert_own"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "messages_update_own"
  on public.messages for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
