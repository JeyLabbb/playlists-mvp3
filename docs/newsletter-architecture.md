# Newsletter Admin Architecture (Draft)

This document captures the first iteration of the in-house “MailerLite-style” control panel the team requested.
It is intentionally detailed so we can iterate on top of it without reverse-engineering implementation choices.

---

## 1. Scope

| Feature | Status (v1) | Notes |
| --- | --- | --- |
| Contact directory | ✅ | `newsletter_contacts` table; supports status, metadata, origin. |
| Groups / segments | ✅ | `newsletter_groups` + `newsletter_contact_groups`. |
| Manual campaigns | ✅ | `newsletter_campaigns`; can target groups or ad-hoc recipients. |
| Immediate send | ✅ | Via `/api/admin/newsletter/campaigns` (send_mode=`immediate`). |
| Scheduled send | ✅ (requires cron) | Jobs stored in `newsletter_jobs`; execute via `/api/admin/newsletter/jobs/run`. |
| Workflows | ✅ (MVP) | Stored in `newsletter_workflows` + steps. Trigger endpoint provided. |
| Tracking (deliver / open / click) | ✅ | `newsletter_campaign_recipients` + `newsletter_events` + `/api/newsletter/track/*`. |
| Dashboard UI | ✅ | `app/admin/newsletter/page.tsx` with tabs (Overview, Contacts, Groups, Campaigns, Workflows, Tracking). |

---

## 2. Data model (new tables)

> SQL migrates inside `supabase/migrations/20251115_newsletter_system.sql`

### `newsletter_contacts`
- Email (unique), name, status (`subscribed`, `unsubscribed`, `bounced`), origin, metadata JSON.

### `newsletter_groups`
- Named segment definitions (manual for now; filters JSON reserved for future).

### `newsletter_contact_groups`
- Junction table between contacts and groups.

### `newsletter_campaigns`
- Draft/scheduled/sent state, title, subject, body, CTA labels/urls, creator info.

### `newsletter_campaign_groups`
- Many-to-many between campaign and groups.

### `newsletter_campaign_recipients`
- One row per contact per campaign (stores send status + timestamps).

### `newsletter_events`
- Append-only log for deliver/open/click/bounce.

### `newsletter_workflows` & `newsletter_workflow_steps`
- Stores automation definitions (trigger type, actions, delays, etc.).

### `newsletter_jobs`
- Scheduler queue (pending, running, done, failed).

---

## 3. APIs (new)

| Route | Methods | Description |
| --- | --- | --- |
| `/api/admin/newsletter/contacts` | GET, POST | List & create contacts (supports group assignment). |
| `/api/admin/newsletter/contacts/[id]` | PATCH, DELETE | Update info, status, groups; delete contact. |
| `/api/admin/newsletter/groups` | GET, POST | List groups with counts; create groups. |
| `/api/admin/newsletter/groups/[id]` | PATCH, DELETE | Rename/describe or remove group. |
| `/api/admin/newsletter/campaigns` | GET, POST | Create campaigns (draft, immediate, scheduled). |
| `/api/admin/newsletter/campaigns/[id]` | GET, PATCH, DELETE | Inspect/update campaign metadata. |
| `/api/admin/newsletter/jobs/run` | POST | Processes due scheduled jobs (hook to cron). |
| `/api/admin/newsletter/workflows` | GET, POST | CRUD workflows. |
| `/api/admin/newsletter/workflows/[id]` | PATCH, DELETE | Update/disable workflow. |
| `/api/admin/newsletter/workflows/trigger` | POST | Manually trigger workflow (used by app logic). |
| `/api/admin/newsletter/analytics` | GET | Summary metrics (deliveries, opens, clicks). |
| `/api/newsletter/track/open` | GET (pixel) | Registers open event. |
| `/api/newsletter/track/click` | GET redirect | Registers click event then redirects to target. |

Existing routes (`/list`, `/add`, `/remove`, `/send`) continue working but are now considered legacy shortcuts.

---

## 4. Admin UI (`app/admin/newsletter/page.tsx`)

**Tabs**
- Overview: key metrics, recent campaigns, job queue.
- Contacts: table + search, multi-select, import/export placeholder.
- Groups: list, create/edit, view membership counts.
- Campaigns: builder (title/subject/body/CTAs/groups/schedule), status timeline.
- Workflows: visual list of automations, step viewer/editor.
- Tracking: charts (deliveries, opens, clicks), per-campaign drilldown.

**Selection logic**
- Contact table exposes multi-select + “select all”, “only founders”, “clear”.
- Campaign builder inherits selection or can target groups.
- Manual overrides tracked in component state.

---

## 5. Sending & tracking pipeline

1. Admin creates campaign (immediate or scheduled).
2. Backend creates `newsletter_campaign` + recipient rows for each contact (based on groups or manual selection).
3. Immediate send:
   - Loops recipients (one-by-one to allow per-contact tracking).
   - Generates HTML via `sendNewsletterEmail` with:
     - Unique delivery row ID (`newsletter_campaign_recipients.id`).
     - Pixel `<img src="/api/newsletter/track/open?...">`.
     - CTA links rewritten to `/api/newsletter/track/click?...&redirect=`.
   - Marks recipient row as `sent` and logs event.
4. Scheduled send:
   - Stores job record; cron hits `/api/admin/newsletter/jobs/run` to process due jobs.
5. Tracking endpoints:
   - Update recipient row (`opened_at`, `clicked_at`) + push event to `newsletter_events`.

---

## 6. Workflows (MVP)

Supported `trigger_type` values:
- `manual` (trigger endpoint call)
- `contact_added`
- `group_joined`

Actions (`action_type`):
- `wait` (config: duration)
- `send_campaign` (config: campaign_id)
- `add_to_group` / `remove_from_group`

Execution: `/api/admin/newsletter/workflows/trigger` processes steps synchronously (scheduling `wait` via jobs table). Long term, we can move to a dedicated worker.

---

## 7. Deployment / Ops notes

1. **Run migration**: `supabase db push` or execute SQL file manually.
2. **Cron for jobs**: Configure Vercel cron (or Supabase scheduler) to call `POST /api/admin/newsletter/jobs/run` every few minutes.
3. **Webhooks for workflows**: Application code should call `POST /api/admin/newsletter/workflows/trigger` when business events occur (e.g., new founder purchase).
4. **Tracking domain**: Ensure `NEXT_PUBLIC_APP_URL` (or `VERCEL_URL`) is set correctly so tracking links resolve with HTTPS.
5. **Resend limits**: Current implementation sends emails per contact for tracking accuracy. Monitor rate limits and consider queueing/batching if contact lists grow.

---

## 8. Follow-ups / Enhancements

- Import/export CSV for contacts.
- Visual workflow builder (drag & drop).
- Template gallery & versioning.
- A/B testing support.
- Bounce/complaint handling (Resend webhook).
- Dedicated background worker for jobs/workflows.
- Segment builder (filters on events / plan / usage).

---

If anything above needs adjustment, ping me before deploying so we keep data/persona parity with other modules. 

