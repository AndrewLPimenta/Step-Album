import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);
const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// Turma 31066
const EDITANDO = ['9551','9699','9891','1878','1890','1896','9448','9449','9533'];
const FI       = ['1887','1902','9425','9537','9566','9574','9587','9751','9759','9778','9860','9966'];

async function update(scs, status) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, student_code')
    .eq('responsible_id', ANDREW_ID)
    .ilike('class_code', '%31066%')
    .in('student_code', scs);
  if (error) { console.error('ERRO:', error.message); return; }

  console.log(`\n=== ${status.toUpperCase()} (${data.length}/${scs.length}) ===`);
  data.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code}`));

  if (data.length === 0) return;
  const ids = data.map(a => a.id);
  const { error: ue } = await supabase.from('albums').update({ status }).in('id', ids);
  if (ue) { console.error('ERRO update:', ue.message); return; }

  await supabase.from('audit_logs').insert({
    action: 'bulk_update', entity: 'albums', entity_id: null,
    metadata: { reason: `Marcar como ${status} — turma 31066, pastas fazendo/banco`, album_ids: ids, count: ids.length },
    user_id: ANDREW_ID,
  });

  const found = new Set(data.map(a => a.student_code));
  const miss = scs.filter(sc => !found.has(sc));
  if (miss.length) console.log(`  ⚠ Sem match: ${miss.join(', ')}`);
}

await update(EDITANDO, 'editando');
await update(FI, 'fotos_insuficientes');
console.log('\n✅ Concluído.');
