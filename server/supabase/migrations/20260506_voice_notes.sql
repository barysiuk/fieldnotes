create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_note_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  recorded_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  status text not null default 'uploaded',
  audio_storage_path text not null,
  duration_ms integer not null,
  size_bytes bigint,
  last_error text,
  unique (user_id, client_note_id)
);

create table if not exists public.note_transcripts (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null unique references public.notes (id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null default 'complete',
  transcript_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.notes
to authenticated, service_role;

grant select on table public.note_transcripts
to authenticated, service_role;

grant insert, update, delete on table public.note_transcripts
to service_role;

alter table public.notes enable row level security;
alter table public.note_transcripts enable row level security;

drop policy if exists "Users can read their own notes" on public.notes;
create policy "Users can read their own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read their own transcripts" on public.note_transcripts;
create policy "Users can read their own transcripts"
on public.note_transcripts
for select
to authenticated
using (
  exists (
    select 1
    from public.notes
    where public.notes.id = public.note_transcripts.note_id
      and public.notes.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

drop policy if exists "Users can manage their own voice note objects" on storage.objects;
create policy "Users can manage their own voice note objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_note_transcripts_updated_at on public.note_transcripts;
create trigger set_note_transcripts_updated_at
before update on public.note_transcripts
for each row
execute function public.set_current_timestamp_updated_at();
