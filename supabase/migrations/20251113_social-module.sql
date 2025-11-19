-- Social module schema (friends, activity, chat)

begin;

create table if not exists friends (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    friend_id uuid not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (user_id, friend_id)
);

create table if not exists friend_requests (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references users (id) on delete cascade,
    receiver_id uuid not null references users (id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    responded_at timestamptz,
    unique (sender_id, receiver_id)
);

create table if not exists friend_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    type text not null check (type in ('playlist_created', 'playlist_shared', 'status')),
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists social_threads (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

create table if not exists thread_participants (
    thread_id uuid not null references social_threads (id) on delete cascade,
    user_id uuid not null references users (id) on delete cascade,
    joined_at timestamptz not null default now(),
    last_read_at timestamptz,
    primary key (thread_id, user_id)
);

create table if not exists social_messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references social_threads (id) on delete cascade,
    sender_id uuid not null references users (id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

alter table if exists playlists
    add column if not exists visibility text not null default 'public' check (visibility in ('public', 'friends', 'private'));

alter table if exists users
    add column if not exists friends_count integer not null default 0,
    add column if not exists last_social_activity_at timestamptz;

-- indexes
create index if not exists friends_user_idx on friends (user_id);
create index if not exists friends_friend_idx on friends (friend_id);
create index if not exists friend_requests_receiver_idx on friend_requests (receiver_id);
create index if not exists friend_activity_user_idx on friend_activity (user_id, created_at desc);
create index if not exists social_messages_thread_idx on social_messages (thread_id, created_at desc);

commit;

