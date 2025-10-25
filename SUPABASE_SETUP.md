# Supabase Integration Setup

## Database Schema

Create the following tables in your Supabase project:

### 1. usage_events
```sql
CREATE TABLE public.usage_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'
);

-- Add indexes for better performance
CREATE INDEX idx_usage_events_user_email ON public.usage_events(user_email);
CREATE INDEX idx_usage_events_created_at ON public.usage_events(created_at);
CREATE INDEX idx_usage_events_action ON public.usage_events(action);
```

### 2. prompts
```sql
CREATE TABLE public.prompts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT NOT NULL,
  text TEXT NOT NULL
);

-- Add indexes for better performance
CREATE INDEX idx_prompts_user_email ON public.prompts(user_email);
CREATE INDEX idx_prompts_created_at ON public.prompts(created_at);
```

### 3. profiles
```sql
CREATE TABLE public.profiles (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT UNIQUE NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_profiles_user_email ON public.profiles(user_email);
CREATE INDEX idx_profiles_last_active_at ON public.profiles(last_active_at);
```

## Environment Variables

Copy the environment variables from `SUPABASE_ENV_EXAMPLE.md` to `web/.env.local`:

```bash
# Supabase Project URL (found in your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

# Supabase Anonymous Key (found in your Supabase dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (found in your Supabase dashboard > Settings > API)
# ⚠️ KEEP THIS SECRET - Never expose to client-side code
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
```

## Features

### Metrics Logging
- **Usage Events**: Tracks when users generate playlists
- **Prompts**: Stores all user prompts for analysis
- **Profiles**: Updates last active timestamp for users

### Debug Page
- **URL**: `/admin/debug/db` (only available in development)
- **Features**: 
  - View latest 50 usage events
  - View latest 50 prompts
  - Database connection status
  - Real-time statistics

### Security
- All database operations use server-side API routes
- Service role key is never exposed to client
- Client only calls our API endpoints

## Usage

The integration automatically logs metrics when:
1. A user generates a playlist (first track appears)
2. The system records the prompt, track count, plan, and remaining uses
3. User's last active timestamp is updated

## Testing

1. Start the development server: `npm run dev`
2. Generate a playlist
3. Check the debug page: `http://localhost:3000/admin/debug/db`
4. Verify metrics are being logged in the server console
