const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

// Crear nueva presentación
const pptx = new PptxGenJS();

// Configurar formato 16:9
pptx.layout = 'LAYOUT_WIDE';
pptx.defineLayout({
  name: 'WIDE',
  width: 10,
  height: 5.625,
});

// Paleta de colores
const colors = {
  primary: '1A1A1A', // Casi negro para texto
  secondary: '666666', // Gris medio
  accent1: '00D9FF', // Azul claro (inicio degradado)
  accent2: '00FF88', // Verde claro (fin degradado)
  background: 'FFFFFF', // Blanco
  lightGray: 'F5F5F7', // Gris muy claro para cards
};

// Función helper para crear degradado (simulado con color sólido)
function getGradientColor() {
  return '1E88E5'; // Azul medio como base
}

// Estilos
const titleStyle = {
  fontSize: 44,
  bold: true,
  color: colors.primary,
  fontFace: 'Arial',
  align: 'left',
};

const subtitleStyle = {
  fontSize: 24,
  color: colors.secondary,
  fontFace: 'Arial',
  align: 'left',
};

const bulletStyle = {
  fontSize: 18,
  color: colors.primary,
  fontFace: 'Arial',
  align: 'left',
  lineSpacing: 28,
};

const smallTextStyle = {
  fontSize: 14,
  color: colors.secondary,
  fontFace: 'Arial',
  align: 'left',
};

// SLIDE 1 — QUÉ ES PLEIA
const slide1 = pptx.addSlide();
slide1.background = { color: colors.background };

// Logo (pequeño, esquina superior)
slide1.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/pleia_logo.png'),
  x: 0.5,
  y: 0.3,
  w: 1.5,
  h: 0.8,
});

// Título
slide1.addText('PLEIA', {
  x: 0.5,
  y: 1.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
  fontSize: 64,
});

// Subtítulo
slide1.addText('Playlists personalizadas con IA a partir de lo que el usuario escribe', {
  x: 0.5,
  y: 2.4,
  w: 9,
  h: 0.6,
  ...subtitleStyle,
});

// Bullets
slide1.addText('• Prompt → playlist completa en segundos\n• Pensada para el momento exacto del usuario\n• Lista para escuchar en Spotify con 1 click', {
  x: 0.5,
  y: 3.2,
  w: 5,
  h: 1.5,
  ...bulletStyle,
  bullet: true,
});

// Imagen principal
slide1.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/app_home.png'),
  x: 6,
  y: 2.5,
  w: 3.5,
  h: 2.5,
});

// SLIDE 2 — EL PROBLEMA
const slide2 = pptx.addSlide();
slide2.background = { color: colors.background };

slide2.addText('Dos problemas que hoy no se resuelven bien', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

// Columna Usuario
slide2.addShape(pptx.ShapeType.roundRect, {
  x: 0.5,
  y: 1.8,
  w: 4.2,
  h: 3,
  fill: { color: colors.lightGray },
  rectRadius: 0.2,
});

slide2.addText('Usuario', {
  x: 0.7,
  y: 2,
  w: 3.8,
  h: 0.4,
  ...titleStyle,
  fontSize: 28,
});

slide2.addText('• Hacer playlists a mano da pereza\n• Las playlists públicas/editoriales son genéricas\n• El usuario quiere música que encaje con SU momento concreto', {
  x: 0.7,
  y: 2.5,
  w: 3.8,
  h: 2,
  ...bulletStyle,
  bullet: true,
});

// Columna Sellos/Distribuidoras
slide2.addShape(pptx.ShapeType.roundRect, {
  x: 5.3,
  y: 1.8,
  w: 4.2,
  h: 3,
  fill: { color: colors.lightGray },
  rectRadius: 0.2,
});

slide2.addText('Sellos/Distribuidoras', {
  x: 5.5,
  y: 2,
  w: 3.8,
  h: 0.4,
  ...titleStyle,
  fontSize: 28,
});

slide2.addText('• El discovery se concentra en playlists públicas grandes\n• Cuesta llegar al nivel personal del oyente\n• No hay una vía clara para entrar en playlists hechas a medida para cada persona', {
  x: 5.5,
  y: 2.5,
  w: 3.8,
  h: 2,
  ...bulletStyle,
  bullet: true,
});

// SLIDE 3 — LA DIFERENCIA DE PLEIA
const slide3 = pptx.addSlide();
slide3.background = { color: colors.background };

slide3.addText('Donde cambia el juego', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

slide3.addText('• PLEIA crea playlists personales y a medida, basadas en intención real\n• El usuario las crea para sí mismo, no para exposición pública\n• Si una canción encaja, entra en una playlist personal y se escucha de verdad', {
  x: 0.5,
  y: 1.8,
  w: 5.5,
  h: 2,
  ...bulletStyle,
  bullet: true,
});

slide3.addText('Discovery contextual, sin forzar canciones fuera de estilo', {
  x: 0.5,
  y: 3.9,
  w: 5.5,
  h: 0.5,
  ...subtitleStyle,
  italic: true,
});

// Imagen
slide3.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/playlist_generated.png'),
  x: 6.2,
  y: 1.5,
  w: 3.3,
  h: 3.5,
});

// SLIDE 4 — CÓMO FUNCIONA
const slide4 = pptx.addSlide();
slide4.background = { color: colors.background };

slide4.addText('Cómo funciona', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

// Paso 1
slide4.addText('Paso 1', {
  x: 0.5,
  y: 1.5,
  w: 2.8,
  h: 0.4,
  ...titleStyle,
  fontSize: 24,
  color: getGradientColor(),
});

slide4.addText('El usuario escribe lo que quiere', {
  x: 0.5,
  y: 1.9,
  w: 2.8,
  h: 0.4,
  ...bulletStyle,
  fontSize: 16,
});

slide4.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/prompt_example.png'),
  x: 0.5,
  y: 2.4,
  w: 2.8,
  h: 2.5,
});

// Paso 2
slide4.addText('Paso 2', {
  x: 3.6,
  y: 1.5,
  w: 2.8,
  h: 0.4,
  ...titleStyle,
  fontSize: 24,
  color: getGradientColor(),
});

slide4.addText('PLEIA genera una playlist completa', {
  x: 3.6,
  y: 1.9,
  w: 2.8,
  h: 0.4,
  ...bulletStyle,
  fontSize: 16,
});

slide4.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/playlist_generated.png'),
  x: 3.6,
  y: 2.4,
  w: 2.8,
  h: 2.5,
});

// Paso 3
slide4.addText('Paso 3', {
  x: 6.7,
  y: 1.5,
  w: 2.8,
  h: 0.4,
  ...titleStyle,
  fontSize: 24,
  color: getGradientColor(),
});

slide4.addText('1 click para abrirla en Spotify', {
  x: 6.7,
  y: 1.9,
  w: 2.8,
  h: 0.4,
  ...bulletStyle,
  fontSize: 16,
});

slide4.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/spotify_export.png'),
  x: 6.7,
  y: 2.4,
  w: 2.8,
  h: 2.5,
});

// SLIDE 5 — MÉTRICAS TEMPRANAS
const slide5 = pptx.addSlide();
slide5.background = { color: colors.background };

slide5.addText('Tracción inicial (early-stage)', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

slide5.addText('• Usuarios: 117\n• Playlists generadas: 218\n• Prompts totales: 429\n• Crecimiento 100% orgánico (sin ads)', {
  x: 0.5,
  y: 1.8,
  w: 5,
  h: 2.5,
  ...bulletStyle,
  bullet: true,
});

slide5.addText('Producto ya operativo, fase temprana.', {
  x: 0.5,
  y: 4.3,
  w: 5,
  h: 0.4,
  ...smallTextStyle,
  italic: true,
});

// Imagen (si existe)
try {
  const metricsPath = path.join(__dirname, '../deck-assets-pleia/dashboard_metrics.png');
  if (fs.existsSync(metricsPath)) {
    slide5.addImage({
      path: metricsPath,
      x: 6,
      y: 1.5,
      w: 3.5,
      h: 3.5,
    });
  }
} catch (e) {
  // Si no existe, continuar sin imagen
}

// SLIDE 6 — MODELO DE COLABORACIÓN
const slide6 = pptx.addSlide();
slide6.background = { color: colors.background };

slide6.addText('Cómo colaboramos', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

slide6.addText('• Las canciones solo aparecen cuando encajan con la intención\n• Integración natural de catálogo\n• Parte del acuerdo se reinvierte en promoción y contenido\n• Métricas básicas para evaluar impacto', {
  x: 1,
  y: 2,
  w: 8,
  h: 2.5,
  ...bulletStyle,
  bullet: true,
});

// SLIDE 7 — PILOTO PROPUESTO
const slide7 = pptx.addSlide();
slide7.background = { color: colors.background };

slide7.addText('Propuesta de piloto', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

slide7.addText('• Duración sugerida: 30 días\n• Objetivo: validar discovery en playlists personales\n• Input del partner: artistas o catálogo foco\n• Output: uso real + feedback', {
  x: 1,
  y: 2,
  w: 8,
  h: 2.5,
  ...bulletStyle,
  bullet: true,
});

// SLIDE 8 — CIERRE
const slide8 = pptx.addSlide();
slide8.background = { color: colors.background };

slide8.addText('¿Lo exploramos?', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.8,
  ...titleStyle,
});

slide8.addText('• Web: https://playlists.jeylabbb.com\n• Material adicional disponible si se solicita\n• Contacto: Jorge — Founder, PLEIA', {
  x: 1,
  y: 2.5,
  w: 8,
  h: 1.5,
  ...bulletStyle,
  bullet: true,
});

// Logo centrado abajo
slide8.addImage({
  path: path.join(__dirname, '../deck-assets-pleia/pleia_logo.png'),
  x: 4.25,
  y: 4.2,
  w: 1.5,
  h: 0.8,
});

// Guardar PPTX
const outputPath = path.join(__dirname, '../PLEIA_Partnerships_Deck.pptx');
pptx.writeFile({ fileName: outputPath }).then(() => {
  console.log('✅ PPTX generado exitosamente:', outputPath);
  console.log('\n📄 Para exportar a PDF:');
  console.log('   - Abre el archivo en PowerPoint/Keynote/LibreOffice');
  console.log('   - Exporta como PDF');
  console.log('   - O usa: LibreOffice --headless --convert-to pdf PLEIA_Partnerships_Deck.pptx');
}).catch((err) => {
  console.error('❌ Error al generar PPTX:', err);
  process.exit(1);
});



