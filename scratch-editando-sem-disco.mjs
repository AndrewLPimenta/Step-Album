import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';

// student_codes presentes em fazendo/banco (turma 31080)
const NO_DISCO_31080 = new Set([
  '0088','0119','0139','0184','0191','0210','0232','0296','0331','0347',
  '0409','0426','0501','0534','0549','0550','0581',
  '0600','0610','0614','0615','0616','0617','0618','0621','0626','0631',
  '0634','0636','0639','0640','0642','0643','0644','0645','0646','0647',
  '0648','0649','0652','0653','0654','0655','0656','0657','0659','0662',
  '0705','0706','0710','0711','0712','0715',
  '0860','0863','0869','0870','0873','0874','0876','0885','0894',
  '0914','0919','0944','1004','1028',
  '9926','9934','9935','9940',
]);

// Busca todos os editando do Andrew
let all = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('albums')
    .select('id, student_name, status, student_code, class_code, cycle_start')
    .eq('responsible_id', ANDREW_ID)
    .eq('status', 'editando')
    .range(from, from + 999);
  if (error) { console.error('ERRO:', error.message); process.exit(1); }
  all = all.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

console.log(`Total editando na tua conta: ${all.length}\n`);

const semDisco = all.filter(a => {
  const cc = (a.class_code || '').replace(/\D/g, '');
  if (cc.includes('31080')) return !NO_DISCO_31080.has(a.student_code);
  return true; // outras turmas → não estão em fazendo/banco
});

console.log(`=== EDITANDO SEM PASTA EM fazendo/banco (${semDisco.length}) ===`);
semDisco.forEach(a =>
  console.log(`  ${a.student_name} | sc=${a.student_code} | class=${a.class_code} | cycle_start=${a.cycle_start}`)
);
