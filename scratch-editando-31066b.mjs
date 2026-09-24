import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// fazendo\banco — turma 31066 (formato 31066{sc}_{nome})
const STUDENT_CODES = [
  '9533','9551','9699','9891',
  '1878','1890','1896',
  '9448','9449',
];

const { data, error } = await supabase
  .from('albums')
  .select('id, student_name, status, student_code')
  .eq('responsible_id', ANDREW_ID)
  .ilike('class_code', '%31066%')
  .in('student_code', STUDENT_CODES);

if (error) { console.error('ERRO:', error.message); process.exit(1); }

console.log(`Encontrados: ${data.length}`);
data.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | status=${a.status}`));

if (data.length === 0) { console.log('Nada a fazer.'); process.exit(0); }

const ids = data.map(a => a.id);
const { error: ue } = await supabase
  .from('albums')
  .update({ status: 'editando' })
  .in('id', ids);

if (ue) { console.error('ERRO ao atualizar:', ue.message); process.exit(1); }
console.log(`\n✓ ${ids.length} marcados como editando`);

await supabase.from('audit_logs').insert({
  action: 'bulk_update',
  entity: 'albums',
  entity_id: null,
  metadata: {
    reason: 'Marcar como editando — álbuns da turma 31066 presentes na pasta fazendo/banco',
    album_ids: ids,
    count: ids.length,
  },
  user_id: ANDREW_ID,
});
console.log('✅ Audit log gravado.');

const foundSCs = new Set(data.map(a => a.student_code));
const notFound = STUDENT_CODES.filter(sc => !foundSCs.has(sc));
if (notFound.length) console.log(`⚠ Sem match: ${notFound.join(', ')}`);
