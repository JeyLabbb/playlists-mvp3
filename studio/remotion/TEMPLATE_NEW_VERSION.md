# 🚀 Template para Nueva Versión de Video

## 📋 Checklist para crear SimplePromoV{X}

### 1. Copiar versión anterior
```bash
cp SimplePromoV1.tsx SimplePromoV2.tsx
```

### 2. Actualizar el componente
```typescript
// En SimplePromoV2.tsx
export const SimplePromoV2: React.FC<SimplePromoV1Props> = ({
  headline,
  prompt,
  cta,
  brandColor,
  accentColor,
}) => {
  // Tu código aquí
};
```

### 3. Registrar en Root.tsx
```typescript
// Añadir import
import { SimplePromoV2 } from './compositions/SimplePromoV2';

// Añadir composición
<Composition
  id="SimplePromoV2"
  component={SimplePromoV2}
  durationInFrames={540} // Ajustar si necesario
  fps={30}
  width={1080}
  height={1920}
  defaultProps={adConfig}
/>
```

### 4. Añadir script en package.json
```json
"studio:remotion:render:promo-v2": "remotion render studio/remotion/src/Root.tsx SimplePromoV2 out/promo-v2.mp4 --chromium-headless"
```

### 5. Actualizar VERSIONS.md
```markdown
### SimplePromoV2 ✅
- **Fecha**: YYYY-MM-DD
- **Duración**: X segundos
- **Descripción**: Descripción de las mejoras
- **Características**:
  - [ ] Nueva característica 1
  - [ ] Nueva característica 2
- **Archivo**: `SimplePromoV2.tsx`
- **Renderizado**: `out/promo-v2.mp4`
```

### 6. Renderizar y probar
```bash
npm run studio:remotion:render:promo-v2
```

### 7. Actualizar documentación principal
Actualizar `studio/README.md` si hay cambios significativos.

## 🎯 Convenciones

- **Números de versión**: V1, V2, V3, etc.
- **Naming consistente**: SimplePromoV{X}
- **Outputs**: out/promo-v{x}.mp4
- **Scripts**: studio:remotion:render:promo-v{x}
- **Siempre mantener versiones anteriores**

## 🔄 Flujo de trabajo recomendado

1. **Planificar** mejoras en VERSIONS.md
2. **Copiar** versión anterior
3. **Implementar** cambios incrementales
4. **Probar** con preview
5. **Renderizar** versión final
6. **Documentar** cambios
7. **Mantener** versiones anteriores

---

**¡Recuerda**: Cada versión debe ser una mejora clara y medible sobre la anterior.
