# PLEIA Partnerships Deck

Deck de partnerships para presentar PLEIA a sellos y distribuidoras musicales.

## Archivos generados

- **PLEIA_Partnerships_Deck.pptx** - Presentación editable en formato PowerPoint
- Este README con instrucciones

## Exportar a PDF

El archivo PPTX puede exportarse a PDF de varias formas:

### Opción 1: PowerPoint (recomendado)
1. Abre `PLEIA_Partnerships_Deck.pptx` en Microsoft PowerPoint
2. Ve a **Archivo** > **Exportar** > **Crear PDF/XPS**
3. Selecciona la ubicación y guarda como PDF

### Opción 2: Keynote (macOS)
1. Abre `PLEIA_Partnerships_Deck.pptx` en Keynote (se convertirá automáticamente)
2. Ve a **Archivo** > **Exportar a** > **PDF**
3. Ajusta las opciones si es necesario y guarda

### Opción 3: Google Slides (online)
1. Sube el archivo a Google Drive
2. Ábrelo con Google Slides
3. Ve a **Archivo** > **Descargar** > **Documento PDF**

### Opción 4: LibreOffice (si está instalado)
```bash
libreoffice --headless --convert-to pdf PLEIA_Partnerships_Deck.pptx
```

## Estructura del deck

El deck incluye 8 slides:

1. **Qué es PLEIA** - Introducción al producto
2. **El Problema** - Problemas de usuarios y sellos/distribuidoras
3. **La Diferencia de PLEIA** - Propuesta de valor única
4. **Cómo Funciona** - Proceso en 3 pasos
5. **Métricas Tempranas** - Tracción inicial (editable)
6. **Modelo de Colaboración** - Cómo trabajamos con partners
7. **Piloto Propuesto** - Propuesta de piloto de 30 días
8. **Cierre** - Información de contacto

## Personalización

El archivo PPTX es completamente editable. Puedes:
- Actualizar métricas en el slide 5
- Ajustar textos según necesidades
- Modificar colores y estilos
- Agregar o quitar contenido

## Regenerar el deck

Para regenerar el deck desde cero:

```bash
node scripts/generate-partnerships-deck.js
```

## Notas de diseño

- Formato: 16:9 (widescreen)
- Estilo: Clean, moderno, tipo Apple/Spotify
- Paleta: Claros con acentos verde-azul
- Tipografía: Arial (compatible, editable)
- Máximo espacio en blanco
- Cards redondeadas



