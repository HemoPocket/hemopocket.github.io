#!/usr/bin/env node
// Fechas de «Actualizado» automáticas por apartado.
//
// Por qué existe: la fecha que se ve al pie de cada apartado era un valor fijo escrito a mano
// (HP_UPD_DATES), y se quedaba vieja aunque el apartado cambiara. Este script calcula una
// «huella» del contenido de cada apartado y, si cambia respecto a la última vez, le pone la
// fecha de hoy. bump.sh lo ejecuta en cada publicación, así que no hay que acordarse.
//
// La huella de un apartado incluye:
//   - el texto que muestra al abrirlo (sin colaboradores, avisos ni la propia fecha);
//   - el código propio del apartado y de las funciones que usa (p. ej. qtCalc en el asistente de QT);
//   - los datos que esas funciones leen (p. ej. QT_SCHEMES con todos los esquemas).
// Las utilidades comunes a muchos apartados (navegación, avisos…) se excluyen, para que un
// cambio general no marque como actualizados todos los apartados a la vez.
//
// Uso:
//   node scripts/upd-dates.mjs            → actualiza scripts/upd-fingerprints.json y HP_UPD_AUTO en la app
//   node scripts/upd-dates.mjs --seed     → reconstruye las fechas a partir del historial de git
//   node scripts/upd-dates.mjs --dry      → solo muestra qué apartados han cambiado
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = new URL('..', import.meta.url).pathname;
const APP = path.join(root, 'HemoPocket_app.html');
const FP = path.join(root, 'scripts', 'upd-fingerprints.json');
const SEED = process.argv.includes('--seed');
const DRY = process.argv.includes('--dry');
const EXPLAIN = (process.argv.indexOf('--explain') > 0) ? process.argv[process.argv.indexOf('--explain') + 1] : null;
const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

function loadPlaywright(){
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch (e) {}
  try { const g = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return req(g + '/playwright'); } catch (e) {}
  return null;
}

// Se ejecuta DENTRO de la página: devuelve { id: huella } de cada apartado.
async function pageFingerprints(explain){
  const KW = new Set('if for while switch catch function return typeof new do else try case await async of in instanceof void delete let const var this super import export yield with class'.split(' '));
  const SKIP = new Set(['HP_UPD_AUTO', 'HP_UPD_DATES', 'HP_BUILD', 'APP_BUILD', 'HP_VERIFIED', 'HP_NO_BANNER', 'HP_NOPAGE', 'MENU', 'MENU0', 'VIEWS']);
  const ge = n => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  // Código fuente de la app: para lo que vive dentro de un cierre (function(){…})() y no es global.
  let SRC = ''; try { SRC = await (await fetch(location.href, { cache: 'no-store' })).text(); } catch (e) {}
  const defs = new Map(); // nombre → [[inicio, tipo]]
  { const re = /(?:\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/g; let m;
    while ((m = re.exec(SRC))) { const n = m[1] || m[2]; if (!defs.has(n)) defs.set(n, []); if (defs.get(n).length < 6) defs.get(n).push([m.index, m[1] ? 'f' : 'v']); } }
  // Fin de una definición, respetando cadenas, plantillas `…${}…`, comentarios y expresiones regulares.
  const endOf = (i, kind) => {
    const st = []; let depth = 0, lastSig = '';
    const cap = Math.min(SRC.length, i + 400000);
    for (; i < cap; i++) {
      const c = SRC[i], n = SRC[i + 1], top = st[st.length - 1];
      if (top === 'T') { if (c === '\\') { i++; continue; } if (c === '`') { st.pop(); continue; } if (c === '$' && n === '{') { st.push('E'); i++; } continue; }
      if (c === '/' && n === '/') { const j = SRC.indexOf('\n', i); i = (j < 0 ? cap : j) - 1; continue; }
      if (c === '/' && n === '*') { const j = SRC.indexOf('*/', i + 2); i = j < 0 ? cap : j + 1; continue; }
      if (c === '"' || c === "'") { i++; while (i < cap && SRC[i] !== c && SRC[i] !== '\n') { if (SRC[i] === '\\') i++; i++; } lastSig = c; continue; }
      if (c === '`') { st.push('T'); lastSig = c; continue; }
      if (c === '/' && (lastSig === '' || '(,=:[!&|?{};+-*%<>~^'.includes(lastSig) || /\b(return|typeof|case)\s*$/.test(SRC.slice(Math.max(0, i - 8), i)))) {
        let inCls = false; i++; while (i < cap && SRC[i] !== '\n') { const d = SRC[i]; if (d === '\\') { i += 2; continue; } if (d === '[') inCls = true; else if (d === ']') inCls = false; else if (d === '/' && !inCls) break; i++; }
        while (/[a-z]/.test(SRC[i + 1] || '')) i++; lastSig = '/r'; continue;
      }
      if (st.length) { if (c === '{') st.push('B'); else if (c === '}') st.pop(); continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { depth--; if (depth <= 0 && c === '}' && kind === 'f') return i + 1; }
      else if (depth <= 0 && kind === 'v' && (c === ';' || (c === '\n' && /[)\]}'"`\w]/.test(lastSig)))) return i + 1;
      if (!/\s/.test(c)) lastSig = c;
    }
    return cap;
  };
  const fromSrc = (n, kinds) => { const L = (defs.get(n) || []).filter(d => kinds.includes(d[1])); return L.length ? L.map(d => SRC.slice(d[0], endOf(d[0], d[1]))).join('\n') : null; };
  const fc = new Map(), cc = new Map();
  const fsrc = n => { if (fc.has(n)) return fc.get(n); let s = null; if (!KW.has(n) && !SKIP.has(n)) { const f = ge(n); if (typeof f === 'function') { s = Function.prototype.toString.call(f); if (/\[native code\]/.test(s)) s = null; } else if (f === undefined) { s = fromSrc(n, ['f', 'v']); if (s && !/^(function|(const|let|var)\s+[\w$]+\s*=\s*(function|\(|[\w$]+\s*=>|async))/.test(s)) s = null; } } fc.set(n, s); return s; };
  const csrc = n => { if (cc.has(n)) return cc.get(n); let s = null; if (!SKIP.has(n)) { const v = ge(n); if (v != null && typeof v !== 'function') { try { s = JSON.stringify(v, (k, x) => x instanceof Set ? [...x] : (x instanceof Map ? [...x] : x)); } catch (e) {} } else if (v === undefined) s = fromSrc(n, ['v']); } cc.set(n, s); return s; };
  const callRe = /(?:(?<=\bwindow\.)|(?<![.\w$]))([A-Za-z_$][\w$]*)\s*\(/g, constRe = /(?:(?<=\bwindow\.)|(?<![.\w$]))([A-Z][A-Z0-9_]{2,})\b/g;
  const calls = src => { const o = new Set(); let m; callRe.lastIndex = 0; while ((m = callRe.exec(src || ''))) if (fsrc(m[1]) != null) o.add(m[1]); return o; };
  const consts = src => { const o = new Set(); let m; constRe.lastIndex = 0; while ((m = constRe.exec(src || ''))) if (!SKIP.has(m[1])) o.add(m[1]); return o; };
  const cyrb = (str) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'); };
  // Sin colaboradores ni avisos de verificación: cambian por motivos ajenos al contenido.
  try { window.renderCollaboratorsBlock = function(){ return ''; }; } catch (e) {}
  try { window.hpVerifyBanner = function(){ return ''; }; } catch (e) {}
  const noBanner = (typeof HP_NO_BANNER !== 'undefined') ? HP_NO_BANNER : new Set();
  const ids = Object.keys(VIEWS).filter(k => !/_post$/.test(k) && !noBanner.has(k));
  const per = {};
  ids.forEach(id => {
    let text = '', html = '';
    try { go(id); const c = document.getElementById('content'); text = c ? c.innerText : ''; html = c ? c.innerHTML : ''; } catch (e) { text = 'ERR'; }
    text = text.replace(/Actualizado:\s*\d{2}\/\d{2}\/\d{4}\s*$/, '').replace(/\s+/g, ' ').trim();
    const seeds = [String(VIEWS[id] || ''), String(VIEWS[id + '_post'] || '')];
    const re = /\son\w+="([^"]*)"/g; let m; while ((m = re.exec(html))) seeds.push(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
    per[id] = { text, seeds };
  });
  // Fase 1: funciones citadas DIRECTAMENTE por muchos apartados = utilidades comunes (no cuentan).
  const direct = new Map();
  ids.forEach(id => { const s = new Set(); per[id].seeds.forEach(src => calls(src).forEach(n => s.add(n))); s.forEach(n => direct.set(n, (direct.get(n) || 0) + 1)); per[id].d1 = s; });
  const LIM = 6;
  const common = new Set([...direct].filter(([, c]) => c > LIM).map(([n]) => n));
  // Fase 2: alcance (hasta 6 niveles) sin atravesar utilidades comunes.
  const cntF = new Map(), cntC = new Map();
  ids.forEach(id => {
    const fns = new Set(), cs = new Set(); let fr = [];
    const scan = src => { calls(src).forEach(n => { if (!common.has(n) && !fns.has(n)) { fns.add(n); fr.push(n); } }); consts(src).forEach(n => cs.add(n)); };
    per[id].seeds.forEach(scan);
    for (let d = 0; d < 6 && fr.length; d++) { const f0 = fr; fr = []; f0.forEach(n => scan(fsrc(n))); }
    per[id].fns = fns; per[id].cs = cs;
    fns.forEach(n => cntF.set(n, (cntF.get(n) || 0) + 1)); cs.forEach(n => cntC.set(n, (cntC.get(n) || 0) + 1));
  });
  const out = {};
  ids.forEach(id => {
    const p = per[id];
    const F = [...p.fns].filter(n => (cntF.get(n) || 0) <= LIM).sort().map(n => n + ':' + fsrc(n)).join('\n');
    const C = [...p.cs].filter(n => (cntC.get(n) || 0) <= LIM && csrc(n) != null).sort().map(n => n + '=' + csrc(n)).join('\n');
    if (explain === id) out['?' + id] = { excl: [...p.cs].filter(n => (cntC.get(n) || 0) > LIM).map(n => n + ':' + cntC.get(n)).concat([...p.fns].filter(n => (cntF.get(n) || 0) > LIM).map(n => n + ':' + cntF.get(n))), fns: [...p.fns].filter(n => (cntF.get(n) || 0) <= LIM).sort(), consts: [...p.cs].filter(n => (cntC.get(n) || 0) <= LIM && csrc(n) != null).sort(), text: p.text.slice(0, 300) };
    out[id] = cyrb(p.text + '\n#S\n' + p.seeds.slice(0, 2).join('\n') + '\n#F\n' + F + '\n#C\n' + C);
  });
  return out;
}

async function withBrowser(fn){
  const pw = loadPlaywright();
  if (!pw || !pw.chromium) throw new Error('no hay navegador (playwright) instalado');
  let appFile = APP;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const srv = http.createServer((req, res) => {
    try {
      let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/HemoPocket_app.html';
      const f = (u === '/HemoPocket_app.html') ? appFile : path.join(root, u);
      if (f !== appFile && !f.startsWith(root)) { res.writeHead(403); return res.end(); }
      const d = fs.readFileSync(f);
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await pw.chromium.launch();
  const fingerprint = async (file) => {
    appFile = file;
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    try {
      // Fecha y azar fijos: la huella no debe cambiar por el día en que se calcula.
      if (ctx.clock && ctx.clock.setFixedTime) await ctx.clock.setFixedTime(new Date('2026-01-15T10:00:00'));
      await ctx.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
      const page = await ctx.newPage();
      await page.route(u => !u.href.startsWith(base), r => r.abort());
      await page.goto(base + '/HemoPocket_app.html', { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2500);
      return await page.evaluate(pageFingerprints, EXPLAIN);
    } finally { await ctx.close(); }
  };
  try { return await fn(fingerprint); } finally { await browser.close(); srv.close(); }
}

function writeAuto(map){
  // Escribe en la app una sola línea con la fecha automática de cada apartado.
  let html = fs.readFileSync(APP, 'utf8');
  const obj = {}; Object.keys(map).sort().forEach(id => { if (map[id] && map[id].d) obj[id] = map[id].d; });
  const line = 'const HP_UPD_AUTO=' + JSON.stringify(obj) + ';';
  if (/^const HP_UPD_AUTO=.*$/m.test(html)) html = html.replace(/^const HP_UPD_AUTO=.*$/m, () => line);
  else {
    const i = html.indexOf('const HP_UPD_DATES={'); if (i < 0) throw new Error('no se encuentra HP_UPD_DATES en la app');
    const j = html.indexOf('\n};', i); if (j < 0) throw new Error('no se encuentra el final de HP_UPD_DATES');
    html = html.slice(0, j + 3) + '\n// Fechas automáticas (scripts/upd-dates.mjs las calcula en cada publicación: no editar a mano).\n' + line + html.slice(j + 3);
  }
  fs.writeFileSync(APP, html);
}

async function main(){
  if (SEED) {
    // Última versión de cada día con cambios en la app, de la más antigua a la más reciente.
    const log = execSync('git log --format=%H\\ %ad --date=short -- HemoPocket_app.html', { cwd: root }).toString().trim().split('\n');
    const byDay = new Map(); log.forEach(l => { const [h, d] = l.split(' '); if (!byDay.has(d)) byDay.set(d, h); });
    const days = [...byDay.keys()].sort();
    const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'hpupd-'));
    const map = {}; let first = true;
    await withBrowser(async fingerprint => {
      for (const d of days) {
        const f = path.join(tmp, d + '.html');
        try { fs.writeFileSync(f, execSync('git show ' + byDay.get(d) + ':HemoPocket_app.html', { cwd: root, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })); }
        catch (e) { continue; } // en esa versión la app aún no tenía este nombre
        let fp = {};
        try { fp = await fingerprint(f); } catch (e) { console.log(d + ': no se pudo calcular (' + String(e.message).split('\n')[0] + ')'); continue; }
        let n = 0;
        Object.keys(fp).forEach(id => { if (!map[id]) { map[id] = { h: fp[id], d: (first ? null : d) }; } else if (map[id].h !== fp[id]) { map[id] = { h: fp[id], d }; n++; } });
        first = false;
        console.log(d + ': ' + Object.keys(fp).length + ' apartados, ' + n + ' con cambios');
        fs.unlinkSync(f);
      }
    });
    // Los apartados que ya existían en la primera versión y no han cambiado conservan su fecha fija.
    Object.keys(map).forEach(id => { if (!map[id].d) delete map[id].d; });
    fs.writeFileSync(FP, JSON.stringify(map, null, 1) + '\n');
    console.log('Huellas iniciales guardadas: ' + Object.keys(map).length + ' apartados.');
    return;
  }
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(FP, 'utf8')); } catch (e) {}
  const fp = await withBrowser(fingerprint => fingerprint(APP));
  const changed = [];
  const next = {};
  Object.keys(fp).forEach(id => {
    const p = prev[id];
    if (!p) { next[id] = { h: fp[id], d: today }; changed.push(id + ' (nuevo)'); }
    else if (p.h !== fp[id]) { next[id] = { h: fp[id], d: today }; changed.push(id); }
    else next[id] = p;
  });
  if (EXPLAIN) { console.log(JSON.stringify(fp['?' + EXPLAIN], null, 1)); return; }
  if (DRY) { console.log(changed.length ? 'Apartados con cambios: ' + changed.join(', ') : 'Ningún apartado ha cambiado.'); return; }
  fs.writeFileSync(FP, JSON.stringify(next, null, 1) + '\n');
  writeAuto(next);
  console.log(changed.length ? 'Fecha de hoy en: ' + changed.join(', ') : 'Fechas de actualización: sin cambios en los apartados.');
}

main().catch(e => { console.error('upd-dates: ' + String(e.message || e).split('\n')[0]); process.exit(1); });
