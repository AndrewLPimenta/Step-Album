import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// ── Turma 31066 ──────────────────────────────────────────────────────────────
const SC_31066 = ['0846','0886','1177'];

// ── Turma 31080 ──────────────────────────────────────────────────────────────
const SC_31080 = [
  '0088','0232','0296','0331','0347',
  '0409','0426','0501','0549',
  '0894','0914','0919','0944','1004',
];

async function processClass(classPattern, studentCodes, label) {
  console.log(`\n=== ${label} ===`);
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code')
    .eq('responsible_id', ANDREW_ID)
    .ilike('class_code', `%${classPattern}%`)
    .in('student_code', studentCodes);
  if (error) { console.error('ERRO:', error.message); return []; }

  const byStatus = {};
  data.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  console.log(`Encontrados: ${data.length} — status atual:`, byStatus);
  data.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | ${a.status}`));

  if (data.length === 0) return [];

  const ids = data.map(a => a.id);
  const { error: ue } = await supabase
    .from('albums').update({ status: 'fotos_insuficientes' }).in('id', ids);
  if (ue) { console.error('ERRO ao atualizar:', ue.message); return []; }
  console.log(`✓ ${ids.length} → fotos_insuficientes`);

  const found = new Set(data.map(a => a.student_code));
  const notFound = studentCodes.filter(sc => !found.has(sc));
  if (notFound.length) console.log(`⚠ Sem match: ${notFound.join(', ')}`);

  return ids;
}

const ids66 = await processClass('31066', SC_31066, 'Turma 31066');
const ids80 = await processClass('31080', SC_31080, 'Turma 31080');

// ── Gabriel Grazioli Do Vale (sc=0000 no banco, pasta 310809926) ─────────────
console.log('\n=== Gabriel Grazioli Do Vale (busca por nome) ===');
const { data: gab, error: ge } = await supabase
  .from('albums')
  .select('id, student_name, status, student_code, kaz_id')
  .eq('responsible_id', ANDREW_ID)
  .ilike('student_name', '%gabriel%grazioli%');
if (ge) { console.error('ERRO:', ge.message); }
else {
  gab.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | kaz=${a.kaz_id} | ${a.status}`));
  // Marca apenas os que NÃO estão já como duplicado
  const toMark = gab.filter(a => a.status !== 'duplicado');
  if (toMark.length > 0) {
    const { error: ue } = await supabase
      .from('albums').update({ status: 'fotos_insuficientes' })
      .in('id', toMark.map(a => a.id));
    if (ue) console.error('ERRO:', ue.message);
    else console.log(`✓ ${toMark.length} → fotos_insuficientes`);
  } else {
    console.log('(já como duplicado ou fotos_insuficientes — sem alteração)');
  }
}

// ── Audit log ────────────────────────────────────────────────────────────────
const allIds = [...ids66, ...ids80];
if (allIds.length > 0) {
  await supabase.from('audit_logs').insert({
    action: 'bulk_update',
    entity: 'albums',
    entity_id: null,
    metadata: {
      reason: 'Marcar como fotos_insuficientes — pasta "fotos insuficientes" do kazz',
      album_ids: allIds,
      count: allIds.length,
    },
    user_id: ANDREW_ID,
  });
  console.log(`\n✅ ${allIds.length} álbuns atualizados. Audit log gravado.`);
}
