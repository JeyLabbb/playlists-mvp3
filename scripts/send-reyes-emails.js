/**
 * Script para enviar emails de Reyes a todos los usuarios
 * Uso: node scripts/send-reyes-emails.js
 * 
 * Requiere:
 * - Estar en el directorio del proyecto
 * - Tener las variables de entorno configuradas (RESEND_API_KEY, etc.)
 * - Tener acceso admin (o ejecutar desde el admin panel)
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jorge@jeylabbb.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function login() {
  if (!ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD no configurado en .env');
    console.log('💡 Alternativa: Usa el admin panel en /admin/reyes');
    process.exit(1);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error('Login failed');
    }

    // Extraer cookie de la respuesta
    const setCookie = res.headers.get('set-cookie');
    const sessionMatch = setCookie?.match(/admin-session=([^;]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    return null;
  }
}

async function sendReyesEmails(sessionToken) {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/reyes/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `admin-session=${sessionToken}`,
      },
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error enviando emails:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando envío de emails de Reyes...\n');

  // Login
  console.log('🔐 Autenticando...');
  const sessionToken = await login();
  if (!sessionToken) {
    console.error('❌ No se pudo autenticar');
    process.exit(1);
  }
  console.log('✅ Autenticado\n');

  // Enviar emails
  console.log('📧 Enviando emails a todos los usuarios...');
  console.log('⏳ Esto puede tardar varios minutos...\n');

  const result = await sendReyesEmails(sessionToken);

  if (result.success) {
    console.log('✅ Emails enviados exitosamente!\n');
    console.log(`📊 Resultados:`);
    console.log(`   - Enviados: ${result.sent}`);
    console.log(`   - Fallidos: ${result.failed}`);
    console.log(`   - Total: ${result.total}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Primeros errores:`);
      result.errors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }
  } else {
    console.error('❌ Error:', result.error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

