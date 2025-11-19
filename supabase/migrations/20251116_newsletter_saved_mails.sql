-- Saved mails repository
create table if not exists public.newsletter_saved_mails (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  subject text,
  body text not null,
  category text default 'general',
  status text not null default 'draft',
  template_id uuid references public.newsletter_templates(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_saved_mails_category_idx on public.newsletter_saved_mails (category);
create index if not exists newsletter_saved_mails_status_idx on public.newsletter_saved_mails (status);

create trigger set_updated_at_newsletter_saved_mails
before update on public.newsletter_saved_mails
for each row execute function public.set_updated_at();

alter table if exists public.newsletter_contacts
  add column if not exists manually_added boolean not null default false;



