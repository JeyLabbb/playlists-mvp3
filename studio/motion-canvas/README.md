# Motion Canvas Animation Studio

This directory contains Motion Canvas scenes for creating programmatic vector animations and technical graphics.

## 🎨 Current Scene

### TechLines
- **Duration**: ~8 seconds
- **Resolution**: 1080×1920 (vertical)
- **Purpose**: Technical network visualization with animated nodes and connections

**Animation Sequence:**
1. **Title**: "TECH LINES" fades in with bounce effect
2. **Grid**: Animated grid lines appear with staggered timing
3. **Nodes**: Main and secondary nodes scale in with elastic animation
4. **Connections**: Lines draw between nodes with smooth transitions
5. **Labels**: Text labels fade in on each node
6. **Pulse**: Final pulse effect on all elements

## 🛠 Usage

### Development Mode
```bash
npm run studio:mc:dev
```
Opens Motion Canvas player with live preview and timeline controls.

### Export to Video
```bash
npm run studio:mc:export
```
Renders the scene to `out/techlines.mp4`.

## 🎯 Animation Techniques

### Easing Functions
- **easeInOutCubic**: Smooth, natural transitions
- **easeOutBack**: Bouncy, playful entrances
- **easeOutElastic**: Elastic, spring-like effects

### Timing
- **Staggered animations**: Elements appear in sequence
- **Layered reveals**: Background → Nodes → Connections → Labels
- **Final pulse**: Synchronized scale and opacity changes

### Visual Elements

#### Grid System
- Horizontal and vertical lines
- Subtle opacity (0.3)
- Creates technical/network aesthetic

#### Node Hierarchy
- **Main nodes**: Large circles (60px) with primary connections
- **Secondary nodes**: Smaller circles (30px) with peripheral connections
- **Accent color**: #00E5A8 for consistency

#### Connection Lines
- **Main connections**: Thicker lines (3px) between primary nodes
- **Secondary connections**: Thinner lines (2px) to peripheral nodes
- **Animated drawing**: Lines appear with smooth transitions

## 🎨 Customization

### Colors
Edit the scene file to change colors:
```typescript
fill="#00E5A8"        // Node color
stroke="#00E5A8"       // Line color
fill="#111111"         // Background color
fill="#ffffff"         // Text color
```

### Timing
Adjust animation durations:
```typescript
yield* all(
  title().opacity(1, 1, easeInOutCubic),        // 1 second
  title().y(-700, 1, easeOutBack),              // 1 second
  waitFor(0.5),                                 // 0.5 second pause
  // ... more animations
);
```

### Layout
Modify node positions:
```typescript
<Circle
  width={60}
  height={60}
  fill="#00E5A8"
  x={-200}  // Horizontal position
  y={-100}  // Vertical position
/>
```

## 📁 File Structure

```
studio/motion-canvas/
├── src/
│   └── scene.techlines.ts    # Main scene file
└── README.md                 # This file
```

## 🚀 Creating New Scenes

1. **Create new scene file**:
   ```typescript
   import { makeScene2D } from '@motion-canvas/2d/lib/scenes';
   
   export default makeScene2D(function* (view) {
     // Your animation code here
   });
   ```

2. **Add to package.json scripts**:
   ```json
   {
     "scripts": {
       "studio:mc:dev:newscene": "motion-canvas studio/motion-canvas/src/scene.newscene.ts --open",
       "studio:mc:export:newscene": "motion-canvas export studio/motion-canvas/src/scene.newscene.ts out/newscene.mp4"
     }
   }
   ```

## 🎨 Scene Ideas

### Future Scenes
- **DataFlow**: Animated data streams and processing
- **LogoReveal**: Brand logo with particle effects
- **NetworkMap**: Complex network topology animation
- **Timeline**: Chronological event visualization
- **PieChart**: Animated data visualization

### Animation Patterns
- **Particle systems**: Floating dots and connections
- **Morphing shapes**: Transform between geometric forms
- **Text animations**: Kinetic typography effects
- **Chart animations**: Data visualization sequences

## 🔧 Technical Notes

### Performance
- **Vector graphics**: Scalable, crisp at any resolution
- **Programmatic control**: Precise timing and sequencing
- **Lightweight**: No external assets required

### Export Options
- **MP4**: Standard video format
- **WEBM**: Web-optimized format
- **GIF**: Animated image format
- **SVG**: Vector animation (experimental)

## 🎵 Audio Integration

Motion Canvas supports audio tracks:
```typescript
import { audio } from '@motion-canvas/core/lib/audio';

export default makeScene2D(function* (view) {
  yield* audio.play('./assets/background.mp3');
  // ... animations synchronized to audio
});
```

## 🚫 Important Notes

- **Isolated from main app**: No impact on playlist functionality
- **Development focused**: Optimized for creative iteration
- **Local rendering**: No cloud dependencies
- **Vector-based**: Crisp at any resolution

## 🔧 Troubleshooting

### Common Issues

1. **Scene not loading**: Check file path in package.json scripts
2. **Export fails**: Ensure output directory exists
3. **Performance issues**: Simplify complex animations
4. **Audio sync**: Use `audio.play()` for synchronization

### Debug Tips

- Use `console.log()` for debugging
- Check browser console for errors
- Simplify animations to isolate issues
- Use `waitFor()` for precise timing control

---

**Motion Canvas**: Where code meets creativity! 🎨✨
