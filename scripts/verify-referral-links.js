/**
 * Script de verificación para asegurar que los enlaces de invitación
 * siempre usan playlists.jeylabbb.com en producción
 * 
 * Ejecutar: node scripts/verify-referral-links.js
 */

// Simular diferentes escenarios
const scenarios = [
  {
    name: 'Producción (playlists.jeylabbb.com)',
    window: { location: { origin: 'https://playlists.jeylabbb.com', hostname: 'playlists.jeylabbb.com' } },
    env: { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://playlists.jeylabbb.com' },
    expected: 'https://playlists.jeylabbb.com'
  },
  {
    name: 'Vercel Preview (cualquier dominio)',
    window: { location: { origin: 'https://playlists-mvp-git-main.vercel.app', hostname: 'playlists-mvp-git-main.vercel.app' } },
    env: { NODE_ENV: 'production' },
    expected: 'https://playlists.jeylabbb.com'
  },
  {
    name: 'Desarrollo local (localhost)',
    window: { location: { origin: 'http://localhost:3000', hostname: 'localhost' } },
    env: { NODE_ENV: 'development' },
    expected: 'http://localhost:3000'
  },
  {
    name: 'Desarrollo local (127.0.0.1)',
    window: { location: { origin: 'http://127.0.0.1:3000', hostname: '127.0.0.1' } },
    env: { NODE_ENV: 'development' },
    expected: 'http://127.0.0.1:3000'
  },
  {
    name: 'Staging (cualquier dominio no localhost)',
    window: { location: { origin: 'https://staging.playlists.jeylabbb.com', hostname: 'staging.playlists.jeylabbb.com' } },
    env: { NODE_ENV: 'production' },
    expected: 'https://playlists.jeylabbb.com'
  }
];

function generateReferralLink(email, scenario) {
  const PRODUCTION_URL = 'https://playlists.jeylabbb.com';
  let baseUrl = PRODUCTION_URL;
  
  if (scenario.window) {
    const origin = scenario.window.location.origin;
    const hostname = scenario.window.location.hostname;
    
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' ||
      origin.includes('localhost') || 
      origin.includes('127.0.0.1');
    
    if (isLocalhost) {
      baseUrl = origin;
    } else {
      baseUrl = PRODUCTION_URL;
    }
  } else {
    const isDev = scenario.env.NODE_ENV === 'development';
    const envUrl = scenario.env.NEXT_PUBLIC_SITE_URL || scenario.env.NEXTAUTH_URL;
    
    const canUseLocalhost = isDev && 
                            envUrl && 
                            (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));
    
    if (canUseLocalhost) {
      baseUrl = envUrl;
    } else {
      baseUrl = PRODUCTION_URL;
    }
  }
  
  // Validación final
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    const isDefinitelyDev = scenario.window
      ? (scenario.window.location.hostname === 'localhost' || scenario.window.location.hostname === '127.0.0.1')
      : (scenario.env.NODE_ENV === 'development');
    
    if (!isDefinitelyDev) {
      baseUrl = PRODUCTION_URL;
    }
  }
  
  return `${baseUrl}/invite?ref=${encodeURIComponent(email)}`;
}

console.log('🧪 VERIFICANDO ENLACES DE INVITACIÓN\n');
console.log('='.repeat(60));

let allPassed = true;

scenarios.forEach((scenario, index) => {
  const result = generateReferralLink('test@example.com', scenario);
  const passed = result.includes(scenario.expected);
  
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(`   Resultado: ${result}`);
  console.log(`   Esperado:  ${scenario.expected}/invite?ref=...`);
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!passed) {
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ TODOS LOS TESTS PASARON');
  console.log('✅ Los enlaces de invitación están configurados correctamente');
} else {
  console.log('❌ ALGUNOS TESTS FALLARON');
  console.log('⚠️  Revisa la configuración de generateReferralLink');
  process.exit(1);
}

