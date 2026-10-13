create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  username      text not null,
  password_hash text,                          -- null si entró con Google
  display_name  text,
  avatar_url    text,
  country       char(2),
  bio           text check (char_length(bio) <= 160),
  auth_provider text not null default 'local' check (auth_provider in ('local','google')),
  google_id     text unique,
  elo_rating    int  not null default 1200,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index users_email_key    on public.users (lower(email));
create unique index users_username_key on public.users (lower(username));

create table public.user_stats (
  user_id        uuid primary key references public.users(id) on delete cascade,
  games_played   int not null default 0,
  wins           int not null default 0,
  losses         int not null default 0,
  draws          int not null default 0,
  current_streak int not null default 0,
  best_elo       int not null default 1200
);

create function public.create_user_stats() returns trigger
language plpgsql as $$
begin
  insert into public.user_stats (user_id) values (new.id);
  return new;
end $$;
create trigger trg_users_stats after insert on public.users
for each row execute function public.create_user_stats();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_users_updated before update on public.users
for each row execute function public.touch_updated_at();

-- RLS activo sin policies: solo el backend (service_role) lee y escribe
alter table public.users      enable row level security;
alter table public.user_stats enable row level security;
