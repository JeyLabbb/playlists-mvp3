# Remotion Animation Studio

This directory contains Remotion compositions for creating animated ads and motion graphics for the playlist app.

## 🎬 Compositions

### AdMain
- **Duration**: 18 seconds (540 frames at 30fps)
- **Resolution**: 1080×1920 (vertical)
- **Purpose**: Main promotional video with three scenes

**Scene Structure:**
1. **Hook (0-3s)**: Headline with spring animation and background Lottie
2. **Demo (3-15s)**: Interactive UI mockup with typing animation, loader, and track list
3. **CTA (15-18s)**: Call-to-action with glow effect and final bump

### HeroBgLoop
- **Duration**: 8 seconds (240 frames at 30fps)
- **Resolution**: 1080×1920 (vertical)
- **Purpose**: Seamless background loop for hero sections

## 🛠 Configuration

Edit `config/ad.json` to customize content and styling:

```json
{
  "headline": "La IA que entiende cómo escuchas",
  "prompt": "underground español para activarme",
  "cta": "playlists.jeylabbb.com",
  "brandColor": "#111111",
  "accentColor": "#00E5A8",
  "enableThree": false
}
```

### Configuration Options

- **headline**: Main title text for the hook scene
- **prompt**: Example prompt text for the demo scene
- **cta**: Call-to-action URL/domain
- **brandColor**: Background color (hex)
- **accentColor**: Highlight color for CTAs and accents (hex)
- **enableThree**: Enable/disable Three.js logo (optional feature)

## 🎨 Components

### TypeOn
Animated typing effect with blinking cursor.

```tsx
<TypeOn
  text="Your text here"
  startFrame={0}
  durationInFrames={90}
  color="#00E5A8"
  fontSize="18px"
/>
```

### Stagger
Apply staggered animations to child elements.

```tsx
<Stagger delay={10} startFrame={0} durationInFrames={30}>
  {children}
</Stagger>
```

### LottieLayer
Wrapper for Lottie animations with opacity and scale controls.

```tsx
<LottieLayer
  src="/studio/lotties/bg-soft-pulse.json"
  opacity={0.2}
  scale={1}
/>
```

### RiveLayer
Wrapper for Rive animations with size and opacity controls.

```tsx
<RiveLayer
  src="/studio/rive/loader.riv"
  width={60}
  height={60}
  opacity={1}
/>
```

### TrackListDemo
Animated track list with staggered entries and hover effects.

```tsx
<TrackListDemo
  tracks={['Track 1 - Artist 1', 'Track 2 - Artist 2']}
  accentColor="#00E5A8"
  startFrame={0}
/>
```

## 🚀 Usage

### Preview
```bash
npm run studio:remotion:preview
```
Opens Remotion Studio for interactive preview and editing.

### Render
```bash
# Render main ad
npm run studio:remotion:render

# Render hero background loop
npm run studio:remotion:render:hero
```

Output files will be saved to `out/` directory:
- `ad.mp4` - Main promotional video
- `hero.mp4` - Background loop video

## 🎯 Animation Tips

### Timing
- **Visual beats**: Add a visual accent every ~2 seconds
- **Scene transitions**: Use 0.5-1 second transitions between scenes
- **Spring animations**: Use for organic, bouncy movements
- **Linear easing**: Use for mechanical, precise movements

### Rhythm
- **Hook**: Quick, attention-grabbing (0-3s)
- **Demo**: Steady pace, building interest (3-15s)
- **CTA**: Strong finish with impact (15-18s)

### Visual Hierarchy
1. **Headlines**: Large, bold, high contrast
2. **Interactive elements**: Subtle animations, clear feedback
3. **Background elements**: Low opacity, non-distracting

## 📁 File Structure

```
studio/remotion/
├── src/
│   ├── Root.tsx                 # Main composition registry
│   ├── compositions/
│   │   ├── AdMain.tsx          # Main ad composition
│   │   └── HeroBgLoop.tsx      # Background loop
│   ├── components/
│   │   ├── TypeOn.tsx          # Typing animation
│   │   ├── Stagger.tsx         # Staggered animations
│   │   ├── LottieLayer.tsx     # Lottie wrapper
│   │   ├── RiveLayer.tsx       # Rive wrapper
│   │   ├── TrackListDemo.tsx   # Track list animation
│   │   └── ThreeLogo.tsx       # 3D logo (optional)
│   └── utils/
│       └── easing.ts           # Easing functions
├── config/
│   └── ad.json                 # Configuration file
└── README.md                   # This file
```

## 🎵 Audio & SFX

For future enhancements, consider adding:
- **Background music**: Subtle, non-distracting
- **Sound effects**: Button clicks, transitions
- **Voice-over**: Clear, energetic narration

## 🚫 Important Notes

- **No backend modifications**: This studio is completely isolated
- **No API changes**: All animations are self-contained
- **Local rendering only**: No cloud services required
- **Development focus**: Optimized for quick iteration

## 🔧 Troubleshooting

### Common Issues

1. **Chrome/Chromium not found**: Install Chrome or set CHROME_BIN environment variable
2. **Out of memory**: Reduce resolution or simplify animations
3. **Slow rendering**: Use `--chromium-headless` flag for faster renders
4. **Asset not found**: Ensure all assets are in `/public/studio/`

### Performance Tips

- Use `spring()` for organic animations
- Limit complex Lottie animations
- Optimize Rive files for size
- Use `interpolate()` for simple transitions

## 🎨 Color Presets

### Dark Theme (Current)
```json
{
  "brandColor": "#111111",
  "accentColor": "#00E5A8"
}
```

### Vibrant Theme
```json
{
  "brandColor": "#1a1a2e",
  "accentColor": "#ff6b6b"
}
```

### Minimal Theme
```json
{
  "brandColor": "#ffffff",
  "accentColor": "#333333"
}
```

---

**Remember**: This is a creative tool for motion graphics. Keep it fun, keep it smooth, and don't touch the backend! 🎬✨
