import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

// Busca todos os álbuns com student_code=9926 na turma 31080 (qualquer responsável)
const { data, error } = await supabase
  .from('albums')
  .select('id, student_name, status, student_code, class_code, kaz_id, responsible_id, cycle_start')
  .ilike('class_code', '%31080%')
  .eq('student_code', '9926');

if (error) { console.error('ERRO:', error.message); process.exit(1); }

console.log(`Encontrados ${data.length} álbum(ns) com sc=9926 na turma 31080:\n`);
data.forEach(a => {
  console.log(`  ID:           ${a.id}`);
  console.log(`  Nome:         ${a.student_name}`);
  console.log(`  Status:       ${a.status}`);
  console.log(`  kaz_id:       ${a.kaz_id}`);
  console.log(`  responsible:  ${a.responsible_id}`);
  console.log(`  cycle_start:  ${a.cycle_start}`);
  console.log('');
});

// Busca também por nome aproximado para ajudar a identificar
console.log('--- Buscando "Bruno Ventatone" ---');
const { data: b } = await supabase
  .from('albums')
  .select('id, student_name, student_code, class_code, kaz_id, status')
  .ilike('student_name', '%bruno%vent%');
b?.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | class=${a.class_code} | kaz=${a.kaz_id} | status=${a.status}`));

console.log('\n--- Buscando "Gabriel Grazioli" ---');
const { data: g } = await supabase
  .from('albums')
  .select('id, student_name, student_code, class_code, kaz_id, status')
  .ilike('student_name', '%gabriel%grazioli%');
g?.forEach(a => console.log(`  ${a.student_name} | sc=${a.student_code} | class=${a.class_code} | kaz=${a.kaz_id} | status=${a.status}`));
