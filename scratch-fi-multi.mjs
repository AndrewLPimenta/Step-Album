import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// Turma 31066 — student_codes das pastas
const SC_31066 = ['1616','1621','1626','1632','1633','1659',
                  '0886','1161','1177','1195','1282','1359','1520','1589','1609','1612'];

// Turma 31080 — student_codes das pastas
const SC_31080 = ['0535','0556','0601','0623','0658','0703','0714'];

// ── Busca e atualiza por turma ───────────────────────────────────────────────
async function processClass(classCode, studentCodes) {
  console.log(`\n=== Turma ${classCode} ===`);
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code')
    .eq('responsible_id', ANDREW_ID)
    .ilike('class_code', `%${classCode}%`)
    .in('student_code', studentCodes);
  if (error) { console.error('ERRO:', error.message); return []; }

  console.log(`Encontrados: ${data.length}`);
  data.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | status=${a.status}`));

  if (data.length === 0) return [];

  const ids = data.map(a => a.id);
  const { error: ue } = await supabase
    .from('albums')
    .update({ status: 'fotos_insuficientes' })
    .in('id', ids);
  if (ue) { console.error('ERRO ao atualizar:', ue.message); return []; }
  console.log(`✓ ${ids.length} marcados como fotos_insuficientes`);

  // SCs sem match
  const found = new Set(data.map(a => a.student_code));
  const notFound = studentCodes.filter(sc => !found.has(sc));
  if (notFound.length) console.log(`⚠ Sem match: ${notFound.join(', ')}`);

  return ids;
}

const ids66 = await processClass('31066', SC_31066);
const ids80 = await processClass('31080', SC_31080);
const allIds = [...ids66, ...ids80];

// ── Audit log ────────────────────────────────────────────────────────────────
if (allIds.length > 0) {
  await supabase.from('audit_logs').insert({
    action: 'bulk_update',
    entity: 'albums',
    entity_id: null,
    metadata: {
      reason: 'Marcar como fotos_insuficientes — álbuns das turmas 31066 e 31080 presentes na pasta fotos insuficientes',
      album_ids: allIds,
      count: allIds.length,
    },
    user_id: ANDREW_ID,
  });
  console.log(`\n✅ ${allIds.length} álbuns atualizados. Audit log gravado.`);
}
