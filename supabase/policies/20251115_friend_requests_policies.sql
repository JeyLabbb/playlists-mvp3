begin;

alter table public.friend_requests enable row level security;

create policy if not exists friend_requests_select_sender_receiver
  on public.friend_requests
  for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy if not exists friend_requests_insert_sender
  on public.friend_requests
  for insert
  with check (auth.uid() = sender_id);

create policy if not exists friend_requests_update_sender
  on public.friend_requests
  for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy if not exists friend_requests_update_receiver
  on public.friend_requests
  for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

create policy if not exists friend_requests_delete_sender
  on public.friend_requests
  for delete
  using (auth.uid() = sender_id);

commit;

