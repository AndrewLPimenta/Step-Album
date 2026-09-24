import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// fazendo\feitos — turma 31066
const STUDENT_CODES = [
  '1139','1142','1143','1147','1150','1151','1154','1157','1158','1160',
  '1162','1165','1166','1167','1169','1171','1173','1174','1176','1179',
  '1181','1182','1185','1199','1201','1211','1231','1232','1242','1256',
  '1257','1268','1284','1325','1337','1348','1351','1355','1358','1360',
  '1363','1364','1365','1368','1369','1372','1390','1414','1415','1416',
  '1434','1435','1437','1441','1521','1531','1702','1708',
  '1095','1106','1113','1131','1132','1133','1135','1136','1138',
];

console.log(`Buscando ${STUDENT_CODES.length} student_codes na turma 31066...`);

let all = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code')
    .eq('responsible_id', ANDREW_ID)
    .ilike('class_code', '%31066%')
    .in('student_code', STUDENT_CODES)
    .range(from, from + 999);
  if (error) { console.error('ERRO:', error.message); process.exit(1); }
  all = all.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

console.log(`Encontrados: ${all.length}\n`);

const byStatus = {};
all.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
console.log('Por status atual:', byStatus);
all.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | status=${a.status}`));

if (all.length === 0) { console.log('\nNada a fazer.'); process.exit(0); }

const ids = all.map(a => a.id);
const { error: ue } = await supabase
  .from('albums')
  .update({ status: 'enviado' })
  .in('id', ids);
if (ue) { console.error('ERRO ao atualizar:', ue.message); process.exit(1); }
console.log(`\n✓ ${ids.length} marcados como enviado`);

await supabase.from('audit_logs').insert({
  action: 'bulk_update',
  entity: 'albums',
  entity_id: null,
  metadata: {
    reason: 'Marcar como enviado — álbuns da turma 31066 presentes na pasta fazendo/feitos',
    album_ids: ids,
    count: ids.length,
    previous_status: byStatus,
  },
  user_id: ANDREW_ID,
});
console.log('✅ Audit log gravado.');

const foundSCs = new Set(all.map(a => a.student_code));
const notFound = STUDENT_CODES.filter(sc => !foundSCs.has(sc));
if (notFound.length) {
  console.log(`\n⚠ ${notFound.length} sem match: ${notFound.join(', ')}`);
}
