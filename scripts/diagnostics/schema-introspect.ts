import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listColumns(table: string) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name,data_type,is_nullable,column_default')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position', { ascending: true });

  if (error) {
    console.error(`Failed to list columns for ${table}:`, error);
    return;
  }

  console.log(`\n=== ${table.toUpperCase()} columns ===`);
  data?.forEach((row) => {
    console.log(
      `${row.column_name} :: ${row.data_type} :: nullable=${row.is_nullable} :: default=${row.column_default}`,
    );
  });
}

async function main() {
  await listColumns('users');
  await listColumns('playlists');
}

main().catch((error) => {
  console.error('Schema introspection failed:', error);
  process.exitCode = 1;
});


