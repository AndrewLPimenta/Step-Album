import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// Novos álbuns adicionados a fazendo\feitos desde a última sincronização
// (status atual: baixado ou editando → montado)

const NOVOS_31066 = [
  '1188','1541','1878','1890','1896','9448','9533','9891',
];

const NOVOS_31080 = [
  '0600','0610','0614','0615','0616','0617','0618','0631',
  '0664','0666','0668','0669','0670','0672','0676','0679',
  '0681','0690','0693','0694','0695',
];

async function fetchAlbums(classPattern, studentCodes) {
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('albums')
      .select('id, student_name, status, student_code')
      .eq('responsible_id', ANDREW_ID)
      .ilike('class_code', `%${classPattern}%`)
      .in('student_code', studentCodes)
      .in('status', ['baixado', 'editando'])
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function bulkUpdate(albums, label) {
  if (albums.length === 0) { console.log(`  (nenhum para ${label})`); return []; }
  const byStatus = {};
  albums.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  console.log(`  ${albums.length} encontrados — status atual:`, byStatus);
  albums.forEach(a =>
    console.log(`    ${a.student_name} | sc=${a.student_code} | ${a.status} → montado`)
  );
  const ids = albums.map(a => a.id);
  const { error } = await supabase.from('albums').update({ status: 'montado' }).in('id', ids);
  if (error) throw new Error(error.message);
  console.log(`  ✓ ${ids.length} → montado`);
  return ids;
}

// ── 31066 ────────────────────────────────────────────────────────────────────
console.log(`\n=== Turma 31066 (${NOVOS_31066.length} SCs) ===`);
const alb66 = await fetchAlbums('31066', NOVOS_31066);
const ids66 = await bulkUpdate(alb66, '31066');

const found66 = new Set(alb66.map(a => a.student_code));
const nf66 = NOVOS_31066.filter(sc => !found66.has(sc));
if (nf66.length) console.log(`  ⚠ Sem match (já montado/enviado ou não existe): ${nf66.join(', ')}`);

// ── 31080 ────────────────────────────────────────────────────────────────────
console.log(`\n=== Turma 31080 (${NOVOS_31080.length} SCs) ===`);
const alb80 = await fetchAlbums('31080', NOVOS_31080);
const ids80 = await bulkUpdate(alb80, '31080');

const found80 = new Set(alb80.map(a => a.student_code));
const nf80 = NOVOS_31080.filter(sc => !found80.has(sc));
if (nf80.length) console.log(`  ⚠ Sem match (já montado/enviado ou não existe): ${nf80.join(', ')}`);

// ── Audit log ────────────────────────────────────────────────────────────────
const allIds = [...ids66, ...ids80];
if (allIds.length > 0) {
  await supabase.from('audit_logs').insert({
    action: 'bulk_update',
    entity: 'albums',
    entity_id: null,
    metadata: {
      reason: 'Sync feitos→montado: novos álbuns adicionados a fazendo\\feitos',
      album_ids_31066: ids66,
      album_ids_31080: ids80,
      count: allIds.length,
    },
    user_id: ANDREW_ID,
  });
  console.log(`\n✅ Total: ${allIds.length} álbuns → montado. Audit log gravado.`);
} else {
  console.log('\n✅ Nenhum álbum precisou ser atualizado (todos já estão em montado ou além).');
}
