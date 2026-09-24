import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// ── EDITANDO: pastas fazendo/1, /2, /3, /4 ──────────────────────────────────
// Só avança se status atual é "baixado" (evita sobrescrever montado/enviado)

const EDITANDO_31080 = [
  // pasta 1
  '1026','1027','1029',
  // pasta 4
  '0600','0610','0614','0615','0616','0617','0618','0621','0626','0631',
  '0664','0665','0666','0668','0669','0670','0672','0676','0679','0680',
  '0681','0690','0693','0694','0695','0696','0697','0698','0699','0700',
  '0701','1028',
];

const EDITANDO_31066 = [
  // pasta 2
  '1190',
  // pasta 4
  '0847','0851','0855','0859','0870',
  '1159','1188','1357','1541',
  '1878','1890','1896',
  '9448','9449','9533','9551','9699','9891',
];

// ── MONTADO: pasta fazendo/feitos ────────────────────────────────────────────
// Avança se status é "baixado" ou "editando"

const MONTADO_31080 = [
  '0119','0139','0184','0191','0210',
  '0534','0550','0581',
  '0634','0636','0639','0640','0642','0643','0644','0645','0646','0647',
  '0648','0649','0652','0653','0654','0655','0656','0657','0659','0662',
  '0705','0706','0710','0711','0712','0715',
  '0860','0863','0869','0870','0873','0874','0876','0885',
  '9935','9940',
];

// ── helpers ──────────────────────────────────────────────────────────────────
async function fetchAlbums(classPattern, studentCodes, statusFilter) {
  let all = [], from = 0;
  while (true) {
    let q = supabase
      .from('albums')
      .select('id, student_name, status, student_code')
      .eq('responsible_id', ANDREW_ID)
      .ilike('class_code', `%${classPattern}%`)
      .in('student_code', studentCodes);
    if (statusFilter) q = q.in('status', statusFilter);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(error.message);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function bulkUpdate(albums, newStatus, label) {
  if (albums.length === 0) { console.log(`  (nenhum para ${label})`); return []; }
  const byStatus = {};
  albums.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  console.log(`  ${albums.length} encontrados — status atual:`, byStatus);
  albums.forEach(a => console.log(`    ${a.student_name} | sc=${a.student_code} | ${a.status} → ${newStatus}`));
  const ids = albums.map(a => a.id);
  const { error } = await supabase.from('albums').update({ status: newStatus }).in('id', ids);
  if (error) throw new Error(error.message);
  console.log(`  ✓ ${ids.length} → ${newStatus}`);
  return ids;
}

// ── BLOCO 1: EDITANDO ────────────────────────────────────────────────────────
console.log('\n=== EDITANDO (fazendo/1,2,3,4) ===');

const ed80 = await fetchAlbums('31080', EDITANDO_31080, ['baixado']);
const ed66 = await fetchAlbums('31066', EDITANDO_31066, ['baixado']);
const editandoAlbums = [...ed80, ...ed66];

console.log(`\nTurma 31080 (${EDITANDO_31080.length} SCs buscados):`);
const ids_ed80 = await bulkUpdate(ed80, 'editando', 'editando-31080');

console.log(`\nTurma 31066 (${EDITANDO_31066.length} SCs buscados):`);
const ids_ed66 = await bulkUpdate(ed66, 'editando', 'editando-31066');

// SCs sem match
const found80 = new Set(ed80.map(a => a.student_code));
const notFound80 = EDITANDO_31080.filter(sc => !found80.has(sc));
if (notFound80.length) console.log(`  ⚠ 31080 sem match: ${notFound80.join(', ')}`);

const found66 = new Set(ed66.map(a => a.student_code));
const notFound66 = EDITANDO_31066.filter(sc => !found66.has(sc));
if (notFound66.length) console.log(`  ⚠ 31066 sem match: ${notFound66.join(', ')}`);

// ── BLOCO 2: MONTADO ─────────────────────────────────────────────────────────
console.log('\n=== MONTADO (fazendo/feitos) ===');

const mont80 = await fetchAlbums('31080', MONTADO_31080, ['baixado', 'editando']);
console.log(`\nTurma 31080 (${MONTADO_31080.length} SCs buscados):`);
const ids_mont80 = await bulkUpdate(mont80, 'montado', 'montado-31080');

const foundMont = new Set(mont80.map(a => a.student_code));
const notFoundMont = MONTADO_31080.filter(sc => !foundMont.has(sc));
if (notFoundMont.length) console.log(`  ⚠ 31080 sem match: ${notFoundMont.join(', ')}`);

// ── AUDIT LOG ────────────────────────────────────────────────────────────────
const allEditandoIds = [...ids_ed80, ...ids_ed66];
const allIds = [...allEditandoIds, ...ids_mont80];

if (allIds.length > 0) {
  await supabase.from('audit_logs').insert({
    action: 'bulk_update',
    entity: 'albums',
    entity_id: null,
    metadata: {
      reason: 'Sync disco→Step: fazendo/1-4 → editando, fazendo/feitos → montado',
      editando_ids: allEditandoIds,
      montado_ids: ids_mont80,
      count: allIds.length,
    },
    user_id: ANDREW_ID,
  });
  console.log(`\n✅ Total: ${allIds.length} álbuns atualizados. Audit log gravado.`);
} else {
  console.log('\n✅ Nenhum álbum precisou ser atualizado.');
}
