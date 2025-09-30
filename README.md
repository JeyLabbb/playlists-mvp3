# JeyLabbb AI Playlist Generator

A robust, AI-powered playlist generation system built with Next.js 15, NextAuth.js, and OpenAI. Generates high-quality playlists from natural language prompts using Spotify's API.

## 🚀 Features

- **AI-Powered Intent Parsing**: Uses OpenAI GPT-4.1 with GPT-4o fallback and structured output to understand complex prompts
- **Robust Playlist Generation**: Multiple strategies (festival, artist, song, style) with audio feature optimization
- **Quality Rules**: No duplicates, artist caps, negative exclusions, round-robin distribution
- **Audio Feature Scoring**: Tempo, energy, valence, acousticness, and danceability optimization
- **Internationalization**: Spanish and English support with language switching
- **Debug Endpoints**: Development-only endpoints for troubleshooting
- **Spotify Integration**: Full OAuth flow with playlist creation

## 🏗️ Architecture

### Core Components

1. **Intent Parser** (`/api/intent`): Converts natural language to structured JSON
2. **Playlist Generator** (`/api/playlist`): Orchestrates Spotify operations and applies quality rules
3. **Music Helpers** (`/lib/music`): Canonical seeds, scoring algorithms, and audio feature processing
4. **Debug Endpoints** (`/api/debug/*`): Development tools for troubleshooting

### Data Flow

```
User Prompt → Intent Parser → Structured JSON → Playlist Generator → Spotify API → Quality Filters → Final Playlist
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- Spotify Developer Account
- OpenAI API Key (optional - falls back to heuristic parsing)

### Environment Variables

Create a `.env.local` file in the `web` directory:

```env
# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=__PEGA_AQUI_UNA_CADENA_BASE64_FUERTE__
NEXTAUTH_DEBUG=true

# Spotify App Credentials (REQUIRED)
SPOTIFY_CLIENT_ID=__TU_ID__
SPOTIFY_CLIENT_SECRET=__TU_SECRET__

# OpenAI (optional - falls back to heuristic parsing)
OPENAI_API_KEY=__TU_OPENAI__
OPENAI_MODEL=gpt-4.1
```

**IMPORTANTE**: 
- La variable `NEXTAUTH_URL=http://localhost:3000` es **OBLIGATORIA** para que funcione el login de Spotify en desarrollo
- Spotify no acepta `localhost` por seguridad, por eso usamos `127.0.0.1` en producción

### Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/spotify`
   - For production: `https://yourdomain.com/api/auth/callback/spotify`
4. Copy the Client ID and Client Secret to your `.env.local`

### Installation

```bash
cd web
npm install
npm run dev
```

## 🎯 Usage

### Basic Prompts

- **Festival**: "calentar para Primavera Sound 2024"
- **Artist Style**: "reggaeton como Bad Bunny pero sin Bad Bunny"
- **Activity**: "música para estudiar, instrumental, sin voces"
- **Running**: "música para correr a 165 BPM"
- **Era**: "pop de los 80s, rock de los 90s"

### Advanced Features

- **Language Control**: "solo español", "Spanish only"
- **Exclusions**: "sin Bad Bunny", "without Drake"
- **BPM Specification**: "120-140 BPM", "tempo 160"
- **Mood Descriptors**: "melancólico", "épico", "relajado"

## 🔧 API Endpoints

### Production Endpoints

- `POST /api/intent` - Parse natural language to structured JSON
- `POST /api/playlist` - Generate playlist from structured intent
- `POST /api/create` - Create playlist in Spotify

### Debug Endpoints (Development Only)

- `GET /api/debug/session` - Check authentication status
- `GET /api/debug/intent?prompt=...&n=50` - Test intent parsing
- `GET /api/debug/playlist?prompt=...&n=50` - Test full pipeline

### Example Debug Usage

```bash
# Test intent parsing
curl "http://localhost:3000/api/debug/intent?prompt=música%20para%20estudiar&n=30"

# Test full pipeline
curl "http://localhost:3000/api/debug/playlist?prompt=reggaeton%20como%20Bad%20Bunny&n=20"
```

## 🎵 Intent Schema

The AI parser converts prompts to this structured format:

```json
{
  "actividad": "estudiar|correr|fiesta|cena|focus",
  "vibes": ["chill", "epic", "dark", "nostalgic"],
  "generos": ["pop", "rock", "electronic"],
  "artistas_in": ["Bad Bunny", "J Balvin"],
  "artistas_out": ["Drake"],
  "epoca": { "from": 1990, "to": 2024 },
  "idiomas": ["es", "en"],
  "tempo_bpm": { "min": 70, "max": 100, "target": 85 },
  "energy": { "min": 0.2, "max": 0.5, "target": 0.35 },
  "valence": { "min": 0.3, "max": 0.6, "target": 0.45 },
  "acousticness": { "min": 0.5, "max": 1.0, "target": 0.7 },
  "danceability": { "min": 0.3, "max": 0.6, "target": 0.45 },
  "tamano_playlist": 50,
  "seeds": {
    "artistas": ["Nujabes", "J Dilla"],
    "canciones": ["Luv(sic) Part 3"],
    "generos": ["lofi", "ambient"]
  },
  "festival": {
    "name": "Primavera Sound",
    "year": 2024,
    "strict_exact_name": true
  }
}
```

## 🎛️ Quality Rules

### Deduplication
- Removes duplicate tracks by `track.id`
- Ensures unique tracks in final playlist

### Artist Caps
- **Hard Cap**: Maximum 2 tracks per artist (configurable)
- **Soft Cap**: ~12% of total tracks per artist
- Prevents artist over-representation

### Negative Exclusions
- Strict exclusion of specified artists
- "sin Bad Bunny" = 0 appearances of Bad Bunny
- Language filtering when specified

### Round-Robin Distribution
- Distributes tracks by artist to avoid clustering
- Ensures variety throughout playlist

### Audio Feature Optimization
- Scores tracks based on target audio features
- Optimizes for tempo, energy, valence, acousticness, danceability
- Applies energy curves (intro → body → outro)

## 🧪 Testing

### Manual Test Cases

1. **Basic Study Playlist**
   ```
   Prompt: "música para estudiar, instrumental, 40 canciones"
   Expected: 40 tracks, >90% instrumental, smooth energy curve
   ```

2. **Running Playlist**
   ```
   Prompt: "música para correr a 165 BPM, 30 canciones"
   Expected: 30 tracks, tempo ~160-170, high energy
   ```

3. **Festival Playlist**
   ```
   Prompt: "calentar para Primavera Sound 2024"
   Expected: Validated artists from festival playlists
   ```

4. **Negative Exclusions**
   ```
   Prompt: "reggaeton como Bad Bunny pero sin Bad Bunny"
   Expected: 0 Bad Bunny tracks, similar style
   ```

5. **Language Filtering**
   ```
   Prompt: "pop español de los 2000s"
   Expected: Spanish language tracks, 2000s era
   ```

### Debug Commands

```bash
# Test session
curl "http://localhost:3000/api/debug/session"

# Test intent parsing
curl "http://localhost:3000/api/debug/intent?prompt=música%20para%20estudiar&n=30"

# Test full pipeline
curl "http://localhost:3000/api/debug/playlist?prompt=reggaeton%20como%20Bad%20Bunny&n=20"
```

## 🎨 UI Features

- **Dark Spotify Theme**: Black/gray color scheme with Spotify green accents
- **Cyan Accents**: Subtle cyan highlights for focus states and badges
- **Apple Typography**: SF Pro Text font family
- **Responsive Design**: Works on desktop and mobile
- **Language Switching**: ES/EN toggle with localStorage persistence
- **Prompt Tips Modal**: Comprehensive guide for writing effective prompts

## 🔍 Troubleshooting

### Common Issues

1. **INVALID_CLIENT Error**
   - Ensure `NEXTAUTH_URL=http://localhost:3000` in `.env.local`
   - Verify redirect URI is registered in Spotify Dashboard

2. **Empty Playlists**
   - Check debug endpoints for intent parsing issues
   - Verify Spotify API credentials
   - Try more specific prompts

3. **Rate Limiting**
   - System includes exponential backoff
   - Check Spotify API quota

### Debug Tools

Use the debug endpoints to trace issues:

```bash
# Check authentication
curl "http://localhost:3000/api/debug/session"

# Test intent parsing
curl "http://localhost:3000/api/debug/intent?prompt=test&n=10"

# Test full pipeline
curl "http://localhost:3000/api/debug/playlist?prompt=test&n=10"
```

## 📁 Project Structure

```
web/
├── app/
│   ├── api/
│   │   ├── intent/route.js          # AI intent parser
│   │   ├── playlist/route.js        # Playlist generation
│   │   ├── create/route.js          # Spotify playlist creation
│   │   └── debug/                   # Debug endpoints
│   ├── components/
│   │   ├── LanguageSwitcher.js      # Language toggle
│   │   ├── EpicSection.js           # Marketing section
│   │   └── PromptTips.js            # Tips modal
│   ├── contexts/
│   │   └── LanguageContext.js       # i18n context
│   ├── locales/
│   │   ├── es.json                  # Spanish translations
│   │   └── en.json                  # English translations
│   └── page.js                      # Main UI
├── lib/
│   ├── helpers.js                   # Core utilities
│   └── music/
│       └── index.js                 # Music processing helpers
└── README.md
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Environment Variables for Production

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
OPENAI_API_KEY=your-openai-key
```

## 📝 License

This project is part of JeyLabbb's portfolio. See [jeylabbb.com](https://jeylabbb.com) for more projects.

## 🤝 Contributing

This is a private project, but feel free to report issues or suggest improvements.

---

**Made with ❤️ by [JeyLabbb](https://jeylabbb.com)**