const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const deckAssetsPath = path.join(__dirname, '../deck-assets-pleia');
const outputPath = path.join(__dirname, '../PLEIA_Partnerships_Deck.pdf');

// Convertir imágenes a base64 para incluir en HTML
function imageToBase64(imgPath) {
  if (!fs.existsSync(imgPath)) return null;
  const imgBuffer = fs.readFileSync(imgPath);
  const ext = path.extname(imgPath).slice(1);
  return `data:image/${ext};base64,${imgBuffer.toString('base64')}`;
}

const images = {
  logo: imageToBase64(path.join(deckAssetsPath, 'pleia_logo.png')),
  appHome: imageToBase64(path.join(deckAssetsPath, 'app_home.png')),
  promptExample: imageToBase64(path.join(deckAssetsPath, 'prompt_example.png')),
  playlistGenerated: imageToBase64(path.join(deckAssetsPath, 'playlist_generated.png')),
  spotifyExport: imageToBase64(path.join(deckAssetsPath, 'spotify_export.png')),
  dashboardMetrics: imageToBase64(path.join(deckAssetsPath, 'dashboard_metrics.png')),
};

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PLEIA - Partnerships Deck</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFFFFF;
      color: #0B0F12;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #FFFFFF;
      position: relative;
    }

    /* Portada */
    .cover {
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px 40px;
      background: linear-gradient(135deg, rgba(54, 226, 180, 0.03) 0%, rgba(91, 140, 255, 0.03) 100%);
      position: relative;
      overflow: hidden;
    }

    .cover::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, rgba(54, 226, 180, 0.08) 0%, transparent 70%);
      border-radius: 50%;
    }

    .cover-logo {
      width: 280px;
      height: auto;
      margin-bottom: 60px;
      position: relative;
      z-index: 1;
    }

    .cover-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 84px;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: #0B0F12;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    .cover-subtitle {
      font-family: 'Inter', sans-serif;
      font-size: 24px;
      font-weight: 400;
      color: #666666;
      text-align: center;
      max-width: 600px;
      position: relative;
      z-index: 1;
    }

    /* Sección */
    .section {
      width: 210mm;
      min-height: 297mm;
      padding: 80px 48px;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }

    .section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #0B0F12;
      margin-bottom: 16px;
    }

    .section-subtitle {
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 400;
      color: #666666;
      margin-bottom: 60px;
    }

    /* Card */
    .card {
      background: #FFFFFF;
      border-radius: 24px;
      padding: 48px;
      margin-bottom: 32px;
      box-shadow: 0 2px 24px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.04);
    }

    .card-large {
      padding: 64px;
    }

    .card-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 600;
      color: #0B0F12;
      margin-bottom: 24px;
    }

    .bullet-list {
      list-style: none;
      padding: 0;
    }

    .bullet-item {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      color: #0B0F12;
      margin-bottom: 20px;
      padding-left: 32px;
      position: relative;
      line-height: 1.7;
    }

    .bullet-item::before {
      content: '•';
      position: absolute;
      left: 0;
      font-size: 24px;
      color: #36E2B4;
      font-weight: bold;
    }

    .bullet-item.blue::before {
      color: #5B8CFF;
    }

    /* Dos columnas */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 40px;
    }

    .card-blue {
      border-left: 4px solid #5B8CFF;
    }

    .card-green {
      border-left: 4px solid #36E2B4;
    }

    /* Imagen */
    .section-image {
      width: 100%;
      max-width: 600px;
      height: auto;
      border-radius: 16px;
      margin: 40px 0;
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
    }

    .section-image-full {
      width: 100%;
      border-radius: 16px;
      margin: 40px 0;
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.08);
    }

    /* Tres pasos */
    .three-steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      margin-top: 48px;
    }

    .step-card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(0, 0, 0, 0.04);
    }

    .step-number {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 48px;
      font-weight: 700;
      color: #5B8CFF;
      margin-bottom: 16px;
    }

    .step-title {
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 500;
      color: #0B0F12;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .step-image {
      width: 100%;
      border-radius: 12px;
      margin-top: 16px;
    }

    /* Métricas */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-top: 48px;
    }

    .metric-card {
      background: linear-gradient(135deg, rgba(54, 226, 180, 0.05) 0%, rgba(91, 140, 255, 0.05) 100%);
      border-radius: 20px;
      padding: 40px;
      border: 1px solid rgba(54, 226, 180, 0.1);
    }

    .metric-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 48px;
      font-weight: 700;
      color: #36E2B4;
      margin-bottom: 8px;
    }

    .metric-label {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      color: #666666;
    }

    /* Highlight */
    .highlight-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 600;
      color: #0B0F12;
      margin: 40px 0 32px 0;
      line-height: 1.4;
    }

    /* Footer/Cierre */
    .footer-section {
      background: linear-gradient(135deg, #0B0F12 0%, #1A232B 100%);
      color: #FFFFFF;
      padding: 80px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 297mm;
    }

    .footer-logo {
      width: 200px;
      height: auto;
      margin-bottom: 48px;
      opacity: 0.9;
    }

    .footer-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 64px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 48px;
      text-align: center;
    }

    .footer-content {
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      color: #C7D0DA;
      text-align: center;
      max-width: 600px;
      line-height: 1.8;
    }

    .footer-link {
      color: #36E2B4;
      text-decoration: none;
    }

    .footer-contact {
      margin-top: 32px;
      font-size: 18px;
      color: #F5F7FA;
    }

    .early-stage-note {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #999999;
      font-style: italic;
      margin-top: 24px;
    }

    /* Utilidades */
    .text-center {
      text-align: center;
    }

    .mt-40 {
      margin-top: 40px;
    }

    .mb-24 {
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <!-- Portada -->
  <div class="container cover">
    ${images.logo ? `<img src="${images.logo}" alt="PLEIA Logo" class="cover-logo">` : ''}
    <h1 class="cover-title">PLEIA</h1>
    <p class="cover-subtitle">AI-generated playlists based on real user intent</p>
  </div>

  <!-- Problema -->
  <div class="container section">
    <h2 class="section-title">El Problema</h2>
    <p class="section-subtitle">Dos problemas que hoy no se resuelven bien</p>
    
    <div class="two-columns">
      <div class="card card-blue">
        <h3 class="card-title">Usuario</h3>
        <ul class="bullet-list">
          <li class="bullet-item blue">Hacer playlists a mano da pereza</li>
          <li class="bullet-item blue">Las playlists públicas/editoriales son genéricas</li>
          <li class="bullet-item blue">El usuario quiere música que encaje con SU momento concreto</li>
        </ul>
      </div>
      
      <div class="card card-green">
        <h3 class="card-title">Sellos / Distribuidoras</h3>
        <ul class="bullet-list">
          <li class="bullet-item">El discovery se concentra en playlists públicas grandes</li>
          <li class="bullet-item">Cuesta llegar al nivel personal del oyente</li>
          <li class="bullet-item">No hay una vía clara para entrar en playlists hechas a medida para cada persona</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Diferencia PLEIA -->
  <div class="container section">
    <h2 class="section-title">Donde cambia el juego</h2>
    
    <div class="card card-large">
      <p class="highlight-text">PLEIA crea playlists personales y a medida, basadas en intención real</p>
      
      <ul class="bullet-list mt-40">
        <li class="bullet-item">El usuario las crea para sí mismo, no para exposición pública</li>
        <li class="bullet-item">Si una canción encaja, entra en una playlist personal y se escucha de verdad</li>
      </ul>
      
      <p class="early-stage-note">Discovery contextual, sin forzar canciones fuera de estilo</p>
    </div>

    ${images.playlistGenerated ? `<img src="${images.playlistGenerated}" alt="Playlist generada" class="section-image-full">` : ''}
  </div>

  <!-- Cómo Funciona -->
  <div class="container section">
    <h2 class="section-title">Cómo funciona</h2>
    <p class="section-subtitle">Proceso en 3 pasos</p>
    
    <div class="three-steps">
      <div class="step-card">
        <div class="step-number">1</div>
        <div class="step-title">El usuario escribe lo que quiere</div>
        ${images.promptExample ? `<img src="${images.promptExample}" alt="Prompt example" class="step-image">` : ''}
      </div>
      
      <div class="step-card">
        <div class="step-number">2</div>
        <div class="step-title">PLEIA genera una playlist completa</div>
        ${images.playlistGenerated ? `<img src="${images.playlistGenerated}" alt="Playlist generada" class="step-image">` : ''}
      </div>
      
      <div class="step-card">
        <div class="step-number">3</div>
        <div class="step-title">1 click para abrirla en Spotify</div>
        ${images.spotifyExport ? `<img src="${images.spotifyExport}" alt="Spotify export" class="step-image">` : ''}
      </div>
    </div>
  </div>

  <!-- Métricas -->
  <div class="container section">
    <h2 class="section-title">Tracción inicial</h2>
    <p class="section-subtitle">Early-stage metrics</p>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">117</div>
        <div class="metric-label">Usuarios</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-value">218</div>
        <div class="metric-label">Playlists generadas</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-value">429</div>
        <div class="metric-label">Prompts totales</div>
      </div>
      
      <div class="metric-card">
        <div class="metric-value">100%</div>
        <div class="metric-label">Crecimiento orgánico (sin ads)</div>
      </div>
    </div>

    <p class="early-stage-note text-center">Producto ya operativo, fase temprana.</p>

    ${images.dashboardMetrics ? `<img src="${images.dashboardMetrics}" alt="Dashboard metrics" class="section-image-full mt-40">` : ''}
  </div>

  <!-- Modelo de Colaboración -->
  <div class="container section">
    <h2 class="section-title">Cómo colaboramos</h2>
    
    <div class="card card-large">
      <ul class="bullet-list">
        <li class="bullet-item">Las canciones solo aparecen cuando encajan con la intención</li>
        <li class="bullet-item">Integración natural de catálogo</li>
        <li class="bullet-item">Parte del acuerdo se reinvierte en promoción y contenido</li>
        <li class="bullet-item">Métricas básicas para evaluar impacto</li>
      </ul>
    </div>
  </div>

  <!-- Piloto -->
  <div class="container section">
    <h2 class="section-title">Propuesta de piloto</h2>
    
    <div class="card card-large">
      <ul class="bullet-list">
        <li class="bullet-item">Duración sugerida: 30 días</li>
        <li class="bullet-item">Objetivo: validar discovery en playlists personales</li>
        <li class="bullet-item">Input del partner: artistas o catálogo foco</li>
        <li class="bullet-item">Output: uso real + feedback</li>
      </ul>
    </div>
  </div>

  <!-- Cierre -->
  <div class="container footer-section">
    ${images.logo ? `<img src="${images.logo}" alt="PLEIA Logo" class="footer-logo">` : ''}
    <h2 class="footer-title">¿Lo exploramos?</h2>
    <div class="footer-content">
      <p><a href="https://playlists.jeylabbb.com" class="footer-link">playlists.jeylabbb.com</a></p>
      <p class="footer-contact">Material adicional disponible si se solicita</p>
      <p class="footer-contact">Jorge — Founder, PLEIA</p>
    </div>
  </div>
</body>
</html>
`;

async function generatePDF() {
  console.log('🚀 Generando PDF premium...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });
    
    console.log('✅ PDF generado exitosamente:', outputPath);
    console.log('📄 Formato: A4 vertical premium');
    console.log('🎨 Diseño: Apple/Spotify style');
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePDF();
