-- Newsletter system schema
-- Run: supabase db push (or apply manually)

create extension if not exists "uuid-ossp";

create table if not exists public.newsletter_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_contacts (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  name text,
  status text not null default 'subscribed',
  origin text,
  plan text,
  is_founder boolean default false,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_event_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_contact_groups (
  contact_id uuid not null references public.newsletter_contacts(id) on delete cascade,
  group_id uuid not null references public.newsletter_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, group_id)
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subject text not null,
  preheader text,
  body text not null,
  primary_cta_label text,
  primary_cta_url text,
  secondary_cta_label text,
  secondary_cta_url text,
  status text not null default 'draft',
  send_mode text not null default 'immediate',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.newsletter_campaign_groups (
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  group_id uuid not null references public.newsletter_groups(id) on delete cascade,
  primary key (campaign_id, group_id)
);

create table if not exists public.newsletter_campaign_recipients (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  contact_id uuid references public.newsletter_contacts(id) on delete set null,
  email text not null,
  status text not null default 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_events (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.newsletter_campaigns(id) on delete cascade,
  recipient_id uuid references public.newsletter_campaign_recipients(id) on delete cascade,
  contact_id uuid references public.newsletter_contacts(id) on delete set null,
  event_type text not null,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists newsletter_events_campaign_idx on public.newsletter_events (campaign_id, occurred_at);

create table if not exists public.newsletter_workflows (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_workflow_steps (
  id uuid primary key default uuid_generate_v4(),
  workflow_id uuid not null references public.newsletter_workflows(id) on delete cascade,
  step_order integer not null,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);

create table if not exists public.newsletter_jobs (
  id uuid primary key default uuid_generate_v4(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  locked_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_jobs_schedule_idx on public.newsletter_jobs (scheduled_for, job_type);

create table if not exists public.newsletter_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  subject text,
  body text not null,
  primary_cta jsonb,
  secondary_cta jsonb,
  is_default boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- simple trigger helpers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_newsletter_groups
before update on public.newsletter_groups
for each row execute function public.set_updated_at();

create trigger set_updated_at_newsletter_contacts
before update on public.newsletter_contacts
for each row execute function public.set_updated_at();

create trigger set_updated_at_newsletter_campaigns
before update on public.newsletter_campaigns
for each row execute function public.set_updated_at();

create trigger set_updated_at_newsletter_workflows
before update on public.newsletter_workflows
for each row execute function public.set_updated_at();

create trigger set_updated_at_newsletter_jobs
before update on public.newsletter_jobs
for each row execute function public.set_updated_at();

