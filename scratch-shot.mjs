import { chromium } from 'playwright';

const [,, action, ...args] = process.argv;
const outDir = 'C:/Users/pimen/AppData/Local/Temp/claude/c--dev-Step-Album/ec5cd688-2c93-4723-ab05-0f12cdbb52d2/scratchpad';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.fill('input[type="email"], input[name="email"]', 'rikzz1245@gmail.com');
await page.fill('input[type="password"], input[name="password"]', 'caua1245');
await page.waitForTimeout(500);
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
console.log('URL after click:', page.url());
await page.screenshot({ path: `${outDir}/after-click.png`, fullPage: true });
await page.waitForURL('**/dashboard', { timeout: 15000 }).catch((e) => console.log('waitForURL failed:', e.message));
await page.waitForLoadState('networkidle');
await page.waitForSelector('text=/Olá,/', { timeout: 20000 }).catch((e) => console.log('heading wait failed:', e.message));
console.log('final URL:', page.url());
await page.screenshot({ path: `${outDir}/dashboard.png`, fullPage: true });

for (const route of ['fila', 'albums', 'financial']) {
  await page.goto(`http://localhost:3000/${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/${route}.png`, fullPage: true });
}

console.log('ERRORS:', JSON.stringify(errors.slice(0, 20)));
await browser.close();
