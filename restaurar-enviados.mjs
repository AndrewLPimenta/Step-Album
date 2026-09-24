import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://mwwgnmhrzkdalkfpxcsu.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY'
);

const ANDREW_ID = '96aa55dd-61d9-4a50-8b25-f00b71b77bcc';
const JA_ENVIADOS = String.raw`C:\Users\pimen\Desktop\kazz\ja enviados`;
const ENVIADOS    = String.raw`C:\Users\pimen\Desktop\kazz\enviados`;

// ── 1. Busca no banco: enviado + concluido para 31066 e 31080 ────────────────
async function fetchPrefixes() {
  const prefixes = new Set();
  for (const classPat of ['31066', '31080']) {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('albums')
        .select('student_code, class_code, status')
        .eq('responsible_id', ANDREW_ID)
        .ilike('class_code', `%${classPat}%`)
        .in('status', ['enviado', 'concluido'])
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const a of data) {
        // Pega os primeiros 5 dígitos do class_code
        const cc = a.class_code.replace(/\D/g, '').slice(0, 5);
        const sc = String(a.student_code).padStart(4, '0');
        prefixes.add(cc + sc);
      }
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  return prefixes;
}

// ── 2. Garante que enviados existe ───────────────────────────────────────────
if (!fs.existsSync(ENVIADOS)) {
  fs.mkdirSync(ENVIADOS, { recursive: true });
  console.log(`✓ Criada pasta: ${ENVIADOS}`);
}

// ── 3. Varre ja enviados e move de volta ─────────────────────────────────────
const prefixes = await fetchPrefixes();
console.log(`\n${prefixes.size} prefixos com status enviado/concluido no banco.`);

const dirs = fs.readdirSync(JA_ENVIADOS, { withFileTypes: true })
  .filter(d => d.isDirectory());

const movidos = [];
const mantidos = [];

for (const dir of dirs) {
  const matched = [...prefixes].some(p => dir.name.startsWith(p));
  if (matched) {
    let dest = path.join(ENVIADOS, dir.name);
    if (fs.existsSync(dest)) dest += '_dup';
    fs.renameSync(path.join(JA_ENVIADOS, dir.name), dest);
    movidos.push(dir.name);
  } else {
    mantidos.push(dir.name);
  }
}

// ── 4. Relatório ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log(`RESTAURADOS → enviados (${movidos.length})`);
console.log('══════════════════════════════════════════');
movidos.forEach(n => console.log(`  ✓ ${n}`));

console.log(`\n  Mantidos em 'ja enviados': ${mantidos.length}`);
console.log('\n✅ Concluído.');
