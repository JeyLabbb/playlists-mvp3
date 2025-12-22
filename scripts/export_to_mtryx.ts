/**
 * Script para exportar datos históricos de PLEIA a CSV para importar en MTRYX
 * 
 * Este script lee datos desde la Supabase de PLEIA y genera archivos CSV estándar
 * que luego se pueden subir manualmente en la UI de MTRYX.
 * 
 * Uso:
 *   npm run export:mtryx
 * 
 * Genera:
 *   - scripts/output/mtryx_contacts.csv
 *   - scripts/output/mtryx_events.csv
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });
config();

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure these are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Escapa un valor para CSV (maneja comillas, comas y saltos de línea)
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Si contiene comillas, comas o saltos de línea, encerrar en comillas y escapar comillas internas
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Escribe una fila CSV
 */
function writeCsvRow(values: any[]): string {
  return values.map(escapeCsvValue).join(',') + '\n';
}

interface UserRow {
  id: string;
  email: string;
  username?: string | null;
  plan?: string | null;
  usage_count?: number | null;
  max_uses?: number | null;
  newsletter_opt_in?: boolean | null;
  marketing_opt_in?: boolean | null;
  terms_accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_founder?: boolean | null;
  is_early_founder_candidate?: boolean | null;
  [key: string]: any;
}

interface UsageEventRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string | null;
  meta: any;
  created_at: string;
}

/**
 * Exporta contactos (usuarios) a CSV
 */
async function exportContacts(): Promise<number> {
  console.log('📋 Exportando contactos...');
  
  // Intentar obtener todos los usuarios
  // NOTA: Asumimos que la tabla se llama 'users'
  // TODO: Ajustar nombre de tabla si es diferente en tu DB
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    throw error;
  }
  
  if (!users || users.length === 0) {
    console.log('⚠️  No se encontraron usuarios');
    return 0;
  }
  
  console.log(`   Encontrados ${users.length} usuarios`);
  
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const csvPath = path.join(outputDir, 'mtryx_contacts.csv');
  const stream = fs.createWriteStream(csvPath, { encoding: 'utf8' });
  
  // Escribir encabezados
  const headers = ['email', 'name', 'created_at', 'newsletter_opt_in', 'extra'];
  stream.write(writeCsvRow(headers));
  
  let exportedCount = 0;
  let errorCount = 0;
  
  for (const user of users as UserRow[]) {
    try {
      const email = user.email?.toLowerCase().trim() || '';
      if (!email) {
        console.warn(`⚠️  Usuario sin email (id: ${user.id}), saltando...`);
        errorCount++;
        continue;
      }
      
      // Determinar nombre (username o nombre extraído del email)
      const name = user.username || user.email?.split('@')[0] || '';
      
      // Fecha de creación
      const createdAt = user.created_at || user.created_at || '';
      
      // Newsletter opt-in (priorizar marketing_opt_in si existe, sino newsletter_opt_in)
      const newsletterOptIn = user.marketing_opt_in !== null ? user.marketing_opt_in : (user.newsletter_opt_in || false);
      
      // Datos extras en JSON
      const extra: Record<string, any> = {
        userId: user.id,
        username: user.username || null,
        plan: user.plan || 'free',
        usageCount: user.usage_count || 0,
        maxUses: user.max_uses,
        isFounder: user.is_founder || false,
        isEarlyFounderCandidate: user.is_early_founder_candidate || false,
        termsAcceptedAt: user.terms_accepted_at || null,
        updatedAt: user.updated_at || null,
      };
      
      const extraJson = JSON.stringify(extra);
      
      // Escribir fila
      const row = [
        email,
        name,
        createdAt,
        newsletterOptIn ? 'true' : 'false',
        extraJson,
      ];
      
      stream.write(writeCsvRow(row));
      exportedCount++;
    } catch (err) {
      console.error(`❌ Error procesando usuario ${user.id}:`, err);
      errorCount++;
    }
  }
  
  stream.end();
  
  console.log(`✅ Contactos exportados: ${exportedCount}`);
  if (errorCount > 0) {
    console.log(`⚠️  Errores: ${errorCount}`);
  }
  console.log(`   Archivo: ${csvPath}`);
  
  return exportedCount;
}

/**
 * Exporta eventos a CSV
 */
async function exportEvents(): Promise<number> {
  console.log('📊 Exportando eventos...');
  
  // Intentar obtener eventos de usage_events
  // TODO: Ajustar nombre de tabla si es diferente en tu DB
  const { data: usageEvents, error: usageError } = await supabase
    .from('usage_events')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (usageError) {
    console.warn('⚠️  Error obteniendo usage_events (puede que no exista):', usageError.message);
    // Continuar aunque no exista la tabla
  }
  
  // Intentar obtener prompts (si existen)
  let prompts: any[] = [];
  try {
    const { data: promptsData, error: promptsError } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!promptsError && promptsData) {
      prompts = promptsData;
      console.log(`   Encontrados ${prompts.length} prompts`);
    }
  } catch (err) {
    console.warn('⚠️  Error obteniendo prompts (puede que no exista la tabla):', err);
  }
  
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const csvPath = path.join(outputDir, 'mtryx_events.csv');
  const stream = fs.createWriteStream(csvPath, { encoding: 'utf8' });
  
  // Escribir encabezados
  const headers = ['type', 'timestamp', 'contact_email', 'properties'];
  stream.write(writeCsvRow(headers));
  
  let exportedCount = 0;
  let errorCount = 0;
  
  // Exportar eventos de usage_events
  if (usageEvents && usageEvents.length > 0) {
    console.log(`   Procesando ${usageEvents.length} eventos de usage...`);
    
    for (const event of usageEvents as UsageEventRow[]) {
      try {
        const email = event.user_email?.toLowerCase().trim() || '';
        if (!email) {
          // Intentar obtener email desde user_id si es necesario
          // Por ahora, saltar si no hay email
          console.warn(`⚠️  Evento sin email (id: ${event.id}), saltando...`);
          errorCount++;
          continue;
        }
        
        const eventType = event.action || 'usage';
        const timestamp = event.created_at || new Date().toISOString();
        
        const properties = {
          eventId: event.id,
          userId: event.user_id,
          action: event.action,
          meta: event.meta || {},
        };
        
        const row = [
          eventType,
          timestamp,
          email,
          JSON.stringify(properties),
        ];
        
        stream.write(writeCsvRow(row));
        exportedCount++;
      } catch (err) {
        console.error(`❌ Error procesando evento ${event.id}:`, err);
        errorCount++;
      }
    }
  }
  
  // Exportar eventos de tipo "signup" desde la tabla users (terms_accepted_at)
  // NOTA: Solo exportamos usuarios que tienen terms_accepted_at como evento de signup
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, terms_accepted_at, created_at')
      .not('terms_accepted_at', 'is', null);
    
    if (!usersError && users && users.length > 0) {
      console.log(`   Procesando ${users.length} eventos de signup...`);
      
      for (const user of users) {
        try {
          const email = user.email?.toLowerCase().trim() || '';
          if (!email) continue;
          
          // Usar terms_accepted_at como timestamp del signup (más preciso que created_at)
          const timestamp = user.terms_accepted_at || user.created_at || new Date().toISOString();
          
          const properties = {
            source: 'pleia_historical_export',
            signupDate: timestamp,
          };
          
          const row = [
            'signup',
            timestamp,
            email,
            JSON.stringify(properties),
          ];
          
          stream.write(writeCsvRow(row));
          exportedCount++;
        } catch (err) {
          console.error(`❌ Error procesando signup de ${user.email}:`, err);
          errorCount++;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️  Error obteniendo signups desde users:', err);
  }
  
  // Exportar prompts como eventos (si existen)
  if (prompts.length > 0) {
    console.log(`   Procesando ${prompts.length} prompts como eventos...`);
    
    for (const prompt of prompts) {
      try {
        const email = prompt.user_email?.toLowerCase().trim() || '';
        if (!email) continue;
        
        const timestamp = prompt.created_at || new Date().toISOString();
        
        const properties = {
          promptId: prompt.id,
          prompt: prompt.prompt || prompt.text || null,
          source: 'pleia_historical_export',
        };
        
        const row = [
          'prompt',
          timestamp,
          email,
          JSON.stringify(properties),
        ];
        
        stream.write(writeCsvRow(row));
        exportedCount++;
      } catch (err) {
        console.error(`❌ Error procesando prompt ${prompt.id}:`, err);
        errorCount++;
      }
    }
  }
  
  stream.end();
  
  console.log(`✅ Eventos exportados: ${exportedCount}`);
  if (errorCount > 0) {
    console.log(`⚠️  Errores: ${errorCount}`);
  }
  console.log(`   Archivo: ${csvPath}`);
  
  return exportedCount;
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando exportación de datos históricos de PLEIA a MTRYX...\n');
  
  try {
    const contactsCount = await exportContacts();
    console.log('');
    
    const eventsCount = await exportEvents();
    console.log('');
    
    console.log('═══════════════════════════════════════');
    console.log('✅ Exportación completada');
    console.log(`   Contactos: ${contactsCount}`);
    console.log(`   Eventos: ${eventsCount}`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📁 Archivos generados:');
    console.log(`   - scripts/output/mtryx_contacts.csv`);
    console.log(`   - scripts/output/mtryx_events.csv`);
    console.log('');
    console.log('📤 Próximos pasos:');
    console.log('   1. Revisa los archivos CSV generados');
    console.log('   2. Súbelos manualmente en la UI de MTRYX');
    console.log('   3. Verifica que los datos se importaron correctamente');
    console.log('');
    // TODO: Futura exportación directa a un endpoint de MTRYX
    // TODO: Export incremental o por rangos de fecha
  } catch (error) {
    console.error('❌ Error durante la exportación:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

