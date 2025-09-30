# 🚀 Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Environment Variables (Required in Vercel)
```bash
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-domain.vercel.app

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Optional: Email notifications
RESEND_API_KEY=your_resend_key
SLACK_WEBHOOK_URL=your_slack_webhook
```

### Spotify App Configuration
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Edit your app settings
3. Add redirect URI: `https://your-domain.vercel.app/api/auth/callback/spotify`
4. Save changes

## 🔍 Production Monitoring

### Health Check Endpoint
```bash
curl https://your-domain.vercel.app/api/health
```

### Streaming Endpoint Test
```bash
curl -H "Accept: text/event-stream" \
     "https://your-domain.vercel.app/api/playlist/stream?prompt=test&target_tracks=5"
```

### Automated Verification
```bash
./verify-production.sh
```

## 📊 Logging in Production

### Vercel Logs
- **Function Logs**: Available in Vercel dashboard
- **Real-time Logs**: `vercel logs --follow`
- **Log Levels**: ERROR, WARN, INFO, DEBUG

### Structured Logging
```javascript
import logger from '../../../lib/logger';

// Production-ready logging
logger.info('Playlist generation started', {
  prompt: 'reggaeton playlist',
  targetTracks: 50,
  userId: 'user123'
});

logger.error('API error occurred', {
  error: error.message,
  stack: error.stack,
  context: 'playlist-generation'
});
```

### Log Examples in Production
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Playlist generation completed",
  "data": {
    "tracksGenerated": 50,
    "duration": "45000ms",
    "mode": "NORMAL"
  },
  "environment": "production",
  "vercel": {
    "region": "iad1",
    "deployment": "deploy_123"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Timeout Errors
```bash
# Check function timeout settings
vercel env ls
# Ensure maxDuration is set to 180s in vercel.json
```

#### 2. Spotify OAuth Issues
```bash
# Verify redirect URI matches exactly
# Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
curl https://your-domain.vercel.app/api/auth/session
```

#### 3. Streaming Not Working
```bash
# Test streaming endpoint
curl -v "https://your-domain.vercel.app/api/playlist/stream?prompt=test&target_tracks=5"
```

#### 4. OpenAI API Issues
```bash
# Check API key and rate limits
# Verify OPENAI_API_KEY is set correctly
```

### Debug Commands

#### Check Environment Variables
```bash
vercel env ls
```

#### View Real-time Logs
```bash
vercel logs --follow
```

#### Test Health Endpoint
```bash
curl https://your-domain.vercel.app/api/health | jq
```

#### Test Streaming
```bash
curl -H "Accept: text/event-stream" \
     "https://your-domain.vercel.app/api/playlist/stream?prompt=reggaeton&target_tracks=10" \
     | head -20
```

## 📈 Performance Monitoring

### Key Metrics to Monitor
- **Response Time**: < 2 minutes for playlist generation
- **Success Rate**: > 95% successful generations
- **Error Rate**: < 5% failed requests
- **Memory Usage**: Monitor function memory consumption

### Vercel Analytics
- Enable Vercel Analytics in dashboard
- Monitor Core Web Vitals
- Track function execution times

## 🔧 Maintenance

### Regular Checks
- [ ] Monitor Vercel logs weekly
- [ ] Check Spotify API rate limits
- [ ] Verify OpenAI API usage
- [ ] Test streaming endpoint monthly
- [ ] Update dependencies quarterly

### Emergency Procedures
1. **Service Down**: Check Vercel status page
2. **High Error Rate**: Review recent logs
3. **Timeout Issues**: Check function configuration
4. **OAuth Issues**: Verify Spotify app settings

## 📞 Support

### Vercel Support
- Dashboard: https://vercel.com/dashboard
- Documentation: https://vercel.com/docs
- Status: https://vercel-status.com

### Spotify API Support
- Dashboard: https://developer.spotify.com/dashboard
- Documentation: https://developer.spotify.com/documentation

### OpenAI Support
- Dashboard: https://platform.openai.com
- Documentation: https://platform.openai.com/docs
