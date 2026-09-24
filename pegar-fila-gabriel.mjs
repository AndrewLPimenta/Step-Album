import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID  = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';
const GABRIEL_ID = 'f04ea95d-692c-499f-a1ed-4ef0ab63e650';
const CICLO_ATUAL = '2026-09-03';

// ── 1. Lista TODOS os álbuns do Gabriel ───────────────────────────────────────
let all = [], from = 0;
while (true) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, student_code, class_code, status, cycle_start, responsible_id')
    .eq('responsible_id', GABRIEL_ID)
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  all = all.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

console.log(`\nTotal na fila do Gabriel: ${all.length}`);

// Agrupa por cycle_start
const porCiclo = {};
all.forEach(a => {
  const k = a.cycle_start ?? '(sem ciclo)';
  if (!porCiclo[k]) porCiclo[k] = [];
  porCiclo[k].push(a);
});
console.log('\nPor ciclo:');
Object.entries(porCiclo).sort().reverse().forEach(([c, items]) => {
  console.log(`  ${c}: ${items.length} álbuns`);
});

// ── 2. Pega os do ciclo anterior (tudo que NÃO é o ciclo atual) ───────────────
const prevAlbums = all.filter(a => a.cycle_start !== CICLO_ATUAL);
console.log(`\nÁlbuns do ciclo anterior: ${prevAlbums.length}`);
prevAlbums.forEach(a =>
  console.log(`  [${a.cycle_start}] ${a.class_code} | ${a.student_code} | ${a.student_name} | ${a.status}`)
);

if (prevAlbums.length === 0) {
  console.log('\n⚠ Nenhum álbum de ciclo anterior encontrado. Transferindo TODOS da fila do Gabriel para o ciclo atual...');
  // Fallback: transfere tudo
  const ids = all.map(a => a.id);
  if (ids.length === 0) { console.log('Fila vazia.'); process.exit(0); }
  const { error } = await supabase.from('albums')
    .update({ responsible_id: ANDREW_ID, cycle_start: CICLO_ATUAL })
    .in('id', ids);
  if (error) throw new Error(error.message);
  console.log(`✅ ${ids.length} álbuns transferidos para sua fila atual.`);
  process.exit(0);
}

// ── 3. Transfere para Andrew no ciclo atual ───────────────────────────────────
const ids = prevAlbums.map(a => a.id);
const { error: ue } = await supabase
  .from('albums')
  .update({ responsible_id: ANDREW_ID, cycle_start: CICLO_ATUAL })
  .in('id', ids);
if (ue) throw new Error('Erro ao atualizar: ' + ue.message);

console.log(`\n✅ ${ids.length} álbuns transferidos para sua fila (ciclo ${CICLO_ATUAL}).`);

// ── 4. Audit log ──────────────────────────────────────────────────────────────
await supabase.from('audit_logs').insert({
  action: 'bulk_update',
  entity: 'albums',
  entity_id: null,
  metadata: {
    reason: `Transferência ciclo anterior de Gabriel para Andrew (ciclo atual ${CICLO_ATUAL})`,
    from_user_id: GABRIEL_ID,
    to_user_id: ANDREW_ID,
    album_ids: ids,
    count: ids.length,
  },
  user_id: ANDREW_ID,
});
console.log('Audit log gravado.');
