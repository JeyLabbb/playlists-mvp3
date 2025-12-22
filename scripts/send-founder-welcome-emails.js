#!/usr/bin/env node

/**
 * Script para enviar emails de bienvenida a founder a usuarios específicos
 * Ejecuta: node scripts/send-founder-welcome-emails.js
 * 
 * Este script llama al endpoint API que maneja el envío de emails
 */

require('dotenv').config({ path: '.env.local' });

const emails = [
  'mateomontoyac301@gmail.com',
  'adrian@huelvayork.com',
  'dikdmpb@gmail.com',
  'albertavila1220@gmail.com',
  'jorgejr200419@gmail.com' // Email de prueba
];

async function sendFounderWelcomeEmails() {
  console.log('📧 Enviando emails de bienvenida a founder...\n');
  console.log(`📋 Total emails a enviar: ${emails.length}\n`);

  try {
    // Obtener la URL base del servidor
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    process.env.VERCEL_URL || 
                    'http://localhost:3002';
    
    const url = `${baseUrl}/api/admin/send-founder-emails`;
    
    console.log(`🌐 Llamando a: ${url}\n`);

    // Leer la clave secreta de admin
    const adminKey = process.env.ADMIN_SECRET_KEY || 'admin-secret-key-change-me';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails, adminKey })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('\n📊 Resumen:');
    console.log(`✅ Emails enviados: ${result.sent}`);
    console.log(`❌ Emails fallidos: ${result.failed}\n`);

    if (result.results.sent.length > 0) {
      console.log('✅ Emails enviados exitosamente:');
      result.results.sent.forEach(email => console.log(`  - ${email}`));
    }

    if (result.results.failed.length > 0) {
      console.log('\n❌ Emails que fallaron:');
      result.results.failed.forEach(({ email, reason }) => {
        console.log(`  - ${email}: ${reason}`);
      });
    }

    return result;

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('\n💡 Asegúrate de que:');
    console.error('   1. El servidor Next.js está corriendo');
    console.error('   2. Estás autenticado como admin (jorgejr200419@gmail.com)');
    console.error('   3. Las variables de entorno están configuradas correctamente');
    process.exit(1);
  }
}

sendFounderWelcomeEmails().then(() => {
  console.log('\n✅ Proceso completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

