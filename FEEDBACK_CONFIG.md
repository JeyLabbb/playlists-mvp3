# Feedback System Configuration

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Feedback System Configuration
FEEDBACK_ENABLED=true
FEEDBACK_POPUP_COOLDOWN_DAYS=7

# Feedback Notifications
FEEDBACK_NOTIFY_EMAIL=jeylabbb@gmail.com
SLACK_WEBHOOK_URL=<optional-slack-webhook-url>
```

## Features Implemented

### 1. UI Components
- ✅ `FeedbackModal` component with rating, textareas, and consent checkbox
- ✅ Full-page feedback route at `/feedback?pid=<playlistId>`
- ✅ Automatic modal display after successful playlist creation

### 2. Cooldown System
- ✅ localStorage-based cooldown with configurable days (default: 7)
- ✅ Respects `FEEDBACK_ENABLED` environment variable
- ✅ Prevents spam by showing modal only once per cooldown period

### 3. API Endpoint
- ✅ `/api/feedback` POST endpoint with validation
- ✅ Rate limiting (max 1 feedback per 24h per user)
- ✅ Data persistence to `/data/feedback.json`
- ✅ Text truncation (max 800 chars per field)

### 4. Data Collection
- ✅ Rating (1-5, required)
- ✅ Issue description (optional, max 800 chars)
- ✅ Improvement suggestion (optional, max 800 chars)
- ✅ Consent for follow-up emails (boolean)
- ✅ Metadata: playlistId, userEmail, userId, intentPrompt, mode, createdAt

### 5. Notifications
- ✅ Email notifications to `FEEDBACK_NOTIFY_EMAIL`
- ✅ Slack notifications via webhook (optional)
- ✅ Rich formatting with rating-based colors
- ✅ Complete feedback data included

### 6. Admin Panel
- ✅ `/admin/feedback` protected by session authentication
- ✅ Lists last 200 feedback entries
- ✅ Sortable table with all feedback data
- ✅ Direct links to Spotify playlists
- ✅ Rating-based color coding

### 5. Integration Points
- ✅ Triggers after successful `/api/spotify/create` response
- ✅ Passes playlist metadata to feedback system
- ✅ Sets cooldown after successful submission

## Usage

1. **Automatic**: Modal appears after creating a playlist (if cooldown allows)
2. **Manual**: Visit `/feedback?pid=<playlistId>` for full-page version
3. **Email**: Users who consent will receive follow-up emails (TODO: implement email queue)

## Data Storage

Feedback is stored in `/data/feedback.json` with the following schema:

```json
{
  "id": "feedback_timestamp_random",
  "rating": 1-5,
  "issue": "string (max 800 chars)",
  "improve": "string (max 800 chars)",
  "consent": boolean,
  "playlistId": "string",
  "userEmail": "string",
  "userId": "string",
  "intentPrompt": "string",
  "mode": "string",
  "createdAt": "ISO string",
  "ip": "string"
}
```

## Rate Limiting

- Maximum 1 feedback submission per user per 24 hours
- In-memory rate limiting (resets on server restart)
- Returns 429 status if rate limited

## Notifications

### Email Notifications
When `FEEDBACK_NOTIFY_EMAIL` is set, the system sends email notifications for each feedback:

**Subject Format:**
```
[Feedback] ⭐{rating} – {userEmail || 'anónimo'}
```

**Body Includes:**
- Rating (1-5)
- User email
- Playlist ID
- Mode
- Intent prompt
- Creation date
- Issue description
- Improvement suggestion
- Consent status

### Slack Notifications
When `SLACK_WEBHOOK_URL` is set, the system posts rich Slack messages:

**Features:**
- Color-coded by rating (green ≥4, yellow ≥3, red <3)
- Structured fields for easy reading
- Direct links to Spotify playlists
- Complete feedback data

## Admin Panel

### Access
- URL: `/admin/feedback`
- Authentication: Requires active session
- Redirects to home if not authenticated

### Features
- **Last 200 entries**: Most recent feedback first
- **Sortable table**: All feedback data visible
- **Direct links**: Click playlist ID to open in Spotify
- **Color coding**: Rating-based text colors
- **Responsive design**: Works on mobile and desktop
- **Real-time stats**: Total count, average rating, distribution

### Table Columns
1. **Fecha**: Creation timestamp
2. **Rating**: 1-5 stars with color coding
3. **Usuario**: Email or 'anónimo'
4. **Playlist ID**: Clickable Spotify link
5. **Modo**: Generation mode used
6. **¿Qué no ha clavado?**: Issue description
7. **Una mejora**: Improvement suggestion

## Email Follow-up (TODO)

The system logs when a user consents to follow-up emails, but the actual email sending mechanism needs to be implemented:

1. Queue email job for 24 hours after playlist creation
2. Check if user submitted feedback
3. If not, send email with CTA to `/feedback?pid=<playlistId>`
4. Use existing mailer or log to console if not available
