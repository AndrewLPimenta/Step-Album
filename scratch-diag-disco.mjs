import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';
const CYCLE    = '2026-09-03';

// ── MAPA DO DISCO ────────────────────────────────────────────────────────────
// Formato: { '31066:1190': 'fazendo/2', ... }
const disco = {};

function add(classCode, scs, pasta) {
  for (const sc of scs) disco[`${classCode}:${sc}`] = pasta;
}

// fazendo/1
add('31080', ['1026','1027','1029'], 'fazendo/1');

// fazendo/2
add('31066', ['1190'], 'fazendo/2');

// fazendo/4
add('31066', ['0847','0851','0855','0859','0870','1159','1188','1357','1541',
              '1878','1890','1896','9448','9449','9533','9551','9699','9891'], 'fazendo/4');
add('31080', ['0600','0610','0614','0615','0616','0617','0618','0621','0626','0631',
              '0664','0665','0666','0668','0669','0670','0672','0676','0679','0680',
              '0681','0690','0693','0694','0695','0696','0697','0698','0699','0700',
              '0701','1028'], 'fazendo/4');

// fazendo/banco
add('31066', ['1878','1890','1896','9448','9449','9533','9551','9699','9891'], 'fazendo/banco');
add('31080', ['0088','0119','0139','0184','0191','0210','0232','0296','0331','0347',
              '0409','0426','0501','0534','0549','0550','0581','0600','0610','0614',
              '0615','0616','0617','0618','0621','0626','0631','0634','0636','0639',
              '0640','0642','0643','0644','0645','0646','0647','0648','0649','0652',
              '0653','0654','0655','0656','0657','0659','0662','0705','0706','0710',
              '0711','0712','0715','0860','0863','0869','0870','0873','0874','0876',
              '0885','0894','0914','0919','0944','1004','1028',
              '9934','9935','9940'], 'fazendo/banco');
// Bruno e Gabriel têm sc=0000 no banco — tratados separado

// fazendo/feitos
add('31080', ['0119','0139','0184','0191','0210','0534','0550','0581','0634','0636',
              '0639','0640','0642','0643','0644','0645','0646','0647','0648','0649',
              '0652','0653','0654','0655','0656','0657','0659','0662','0705','0706',
              '0710','0711','0712','0715','0860','0863','0869','0870','0873','0874',
              '0876','0885','9935','9940'], 'fazendo/feitos');

// enviados
add('31066', ['0887','0888','0900','0909','0910','0920',
              '1095','1106','1113','1131','1132','1133','1135','1136','1138',
              '1139','1142','1143','1147','1150','1151','1154','1157','1158','1160',
              '1162','1165','1166','1167','1169','1171','1173','1174','1176','1179',
              '1181','1182','1185','1199','1201','1211','1231','1232','1242','1256',
              '1257','1268','1284','1325','1337','1348','1351','1355','1358','1360',
              '1363','1364','1365','1368','1369','1372','1390','1414','1415','1416',
              '1434','1435','1437','1441','1521','1531','1702','1708'], 'enviados');
add('31080', ['0445','0449','0451','0452','0454','0598'], 'enviados');

// ── CONSULTA: todos os álbuns do Andrew no ciclo atual ───────────────────────
console.log(`Carregando álbuns do ciclo ${CYCLE}...\n`);
let all = [], from = 0;
while (true) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code, class_code')
    .eq('responsible_id', ANDREW_ID)
    .eq('cycle_start', CYCLE)
    .not('status', 'in', '("duplicado","fotos_insuficientes","descartado")')
    .range(from, from + 999);
  if (error) { console.error('ERRO:', error.message); process.exit(1); }
  all = all.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}
console.log(`Total na fila ativa: ${all.length} álbuns\n`);

// ── CRUZAMENTO ───────────────────────────────────────────────────────────────
const classCodes66 = ['31066'];
const classCodes80 = ['31080'];

function normalizeClass(cc) {
  if (!cc) return '';
  if (cc.includes('31066')) return '31066';
  if (cc.includes('31080')) return '31080';
  return cc;
}

const dbMap = {}; // '31066:1190' → album
for (const a of all) {
  const cls = normalizeClass(a.class_code);
  const key = `${cls}:${a.student_code}`;
  dbMap[key] = a;
}

// 1. Álbuns no banco SEM pasta no disco
console.log('═══════════════════════════════════════════════════════════');
console.log('1. NA FILA, SEM PASTA NO DISCO (status atual não é baixado)');
console.log('═══════════════════════════════════════════════════════════');
const semDisco = all.filter(a => {
  const cls = normalizeClass(a.class_code);
  return !disco[`${cls}:${a.student_code}`];
});
const semDiscoNaoBaixado = semDisco.filter(a => a.status !== 'baixado');
if (semDiscoNaoBaixado.length === 0) {
  console.log('  ✓ Nenhum (todos sem pasta estão como baixado — correto)\n');
} else {
  semDiscoNaoBaixado.forEach(a => {
    const cls = normalizeClass(a.class_code);
    console.log(`  ⚠ ${a.student_name} | ${cls}:${a.student_code} | status=${a.status}`);
  });
  console.log('');
}

// 2. Álbuns no banco com status "baixado" mas TEM pasta no disco
console.log('═══════════════════════════════════════════════════════════');
console.log('2. TEM PASTA NO DISCO, MAS AINDA ESTÁ COMO "baixado" NO DB');
console.log('═══════════════════════════════════════════════════════════');
const baixadoComDisco = all.filter(a => {
  const cls = normalizeClass(a.class_code);
  return a.status === 'baixado' && disco[`${cls}:${a.student_code}`];
});
if (baixadoComDisco.length === 0) {
  console.log('  ✓ Nenhum\n');
} else {
  baixadoComDisco.forEach(a => {
    const cls = normalizeClass(a.class_code);
    const pasta = disco[`${cls}:${a.student_code}`];
    console.log(`  ⚠ ${a.student_name} | ${cls}:${a.student_code} | pasta=${pasta}`);
  });
  console.log('');
}

// 3. Pastas no disco sem match no banco
console.log('═══════════════════════════════════════════════════════════');
console.log('3. PASTA NO DISCO SEM REGISTRO NA FILA ATIVA DO STEP');
console.log('═══════════════════════════════════════════════════════════');
let semBanco = 0;
for (const [key, pasta] of Object.entries(disco)) {
  if (!dbMap[key]) {
    console.log(`  ⚠ ${key} (${pasta})`);
    semBanco++;
  }
}
if (semBanco === 0) console.log('  ✓ Nenhum');
console.log('');

// 4. Resumo de status dos álbuns no disco
console.log('═══════════════════════════════════════════════════════════');
console.log('4. STATUS DOS ÁLBUNS QUE TÊM PASTA NO DISCO');
console.log('═══════════════════════════════════════════════════════════');
const statusCount = {};
for (const [key] of Object.entries(disco)) {
  const a = dbMap[key];
  const st = a ? a.status : '(sem match)';
  statusCount[st] = (statusCount[st] || 0) + 1;
}
Object.entries(statusCount).sort().forEach(([st, n]) => console.log(`  ${st}: ${n}`));
console.log('');

// 5. Álbuns baixado sem pasta (são os que genuinamente faltam no disco)
console.log('═══════════════════════════════════════════════════════════');
console.log('5. STATUS "baixado" SEM PASTA — AINDA PRECISAM SER BAIXADOS');
console.log('═══════════════════════════════════════════════════════════');
const baixadoSemDisco = all.filter(a => {
  const cls = normalizeClass(a.class_code);
  return a.status === 'baixado' && !disco[`${cls}:${a.student_code}`];
});
console.log(`Total: ${baixadoSemDisco.length}`);
baixadoSemDisco.forEach(a => {
  const cls = normalizeClass(a.class_code);
  console.log(`  ${a.student_name} | ${cls}:${a.student_code}`);
});
