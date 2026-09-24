import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// Pastas: formato {class_code}{student_code}_{nome}
// class_code = 31080 (5 dígitos), student_code = 4 dígitos restantes
const STUDENT_CODES = [
  '0409','0426','0501','0534','0549','0550','0581',
  '0600','0610','0614','0615','0616','0617','0618','0621','0626','0631',
  '0634','0636','0639','0640','0642','0643','0644','0645','0646','0647',
  '0648','0649','0652','0653','0654','0655','0656','0657','0659','0662',
  '0705','0706','0710','0711','0712','0715',
  '0860','0863','0869','0870','0873','0874','0876','0885','0894',
  '0914','0919','0944','1004','1028',
  '9926','9934','9935','9940',
  '0088','0119','0139','0184','0191','0210','0232','0296','0331','0347',
];

// ── 1. Busca álbuns do Andrew na turma 31080 ─────────────────────────────────
console.log('Carregando álbuns do Andrew (turma 31080)...');
let all = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code, class_code, cycle_start')
    .eq('responsible_id', ANDREW_ID)
    .ilike('class_code', '%31080%')
    .range(from, from + 999);
  if (error) { console.error('ERRO:', error.message); process.exit(1); }
  all = all.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`Total na conta: ${all.length} álbuns\n`);

// ── 2. Cruza por student_code ─────────────────────────────────────────────────
const scSet = new Set(STUDENT_CODES);
const toUpdate = all.filter(a => a.student_code && scSet.has(a.student_code));

// Relatório por status atual
const byStatus = {};
toUpdate.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

console.log(`Match: ${toUpdate.length} álbuns`);
console.log('Por status atual:', byStatus);
toUpdate.forEach(a =>
  console.log(`  ${a.student_name} | sc=${a.student_code} | status=${a.status} | cycle_start=${a.cycle_start}`)
);

if (toUpdate.length === 0) { console.log('\nNada a fazer.'); process.exit(0); }

// ── 3. Atualiza para "editando" ───────────────────────────────────────────────
const ids = toUpdate.map(a => a.id);
const { error: ue } = await supabase
  .from('albums')
  .update({ status: 'editando' })
  .in('id', ids);
if (ue) { console.error('ERRO ao atualizar:', ue.message); process.exit(1); }
console.log(`\n✓ ${ids.length} álbuns marcados como editando`);

// ── 4. Audit log ─────────────────────────────────────────────────────────────
await supabase.from('audit_logs').insert({
  action: 'bulk_update',
  entity: 'albums',
  entity_id: null,
  metadata: {
    reason: 'Marcar como editando — álbuns da turma 31080 presentes na pasta fazendo/banco',
    album_ids: ids,
    count: ids.length,
    previous_status: byStatus,
  },
  user_id: ANDREW_ID,
});
console.log('✅ Audit log gravado.');

// ── 5. Alerta: SCs sem match ─────────────────────────────────────────────────
const foundSCs = new Set(toUpdate.map(a => a.student_code));
const notFound = STUDENT_CODES.filter(sc => !foundSCs.has(sc));
if (notFound.length > 0) {
  console.log(`\n⚠ ${notFound.length} student_codes sem match no banco:`);
  notFound.forEach(sc => console.log(`  ${sc}`));
}
