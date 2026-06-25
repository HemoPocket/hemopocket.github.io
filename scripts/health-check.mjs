#!/usr/bin/env node
// Revisión automática de salud de HemoPocket.
// Comprueba invariantes que, de romperse, causarían fallos (especialmente de SINCRONIZACIÓN:
// que toda edición llegue a todos los dispositivos). Sale con código 1 si encuentra problemas.
// Se ejecuta cada semana desde .github/workflows/revision-semanal.yml y también a mano:
//   node scripts/health-check.mjs
import fs from 'node:fs';

const problems = [];
const notes = [];
function problem(msg){ problems.push(msg); }
function note(msg){ notes.push(msg); }

const root = new URL('..', import.meta.url).pathname;
const APP = root + 'HemoPocket_app.html';
const SW = root + 'sw.js';
const RULES = root + 'firebase/firestore.rules';

let html = '';
try { html = fs.readFileSync(APP, 'utf8'); }
catch(e){ problem('No se puede leer HemoPocket_app.html: ' + e.message); finish(); }

// 1) Sintaxis de TODOS los bloques <script> embebidos (no los que tienen src=).
{
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(html))) {
    i++;
    const attrs = m[1] || '';
    if (/\bsrc=/.test(attrs)) continue;
    let code = m[2].replace(/^\s*import\b[^;]*;?\s*$/gm, '').replace(/^\s*export\b/gm, '');
    try { new Function(code); }
    catch(e){ bad++; problem('Error de sintaxis JS en el bloque <script> #' + i + ': ' + e.message); }
  }
  note('Bloques <script> validados: ' + i + (bad ? (' (' + bad + ' con error)') : ' (todos correctos)'));
}

// 2) La versión de compilación (HP_BUILD) debe coincidir con la del caché del service worker
//    (de lo contrario, los dispositivos no reciben la versión nueva del código).
{
  const b = html.match(/const HP_BUILD = (\d+);/);
  let sw = '';
  try { sw = fs.readFileSync(SW, 'utf8'); } catch(e){ problem('No se puede leer sw.js: ' + e.message); }
  const c = sw.match(/hemopocket-v(\d+)/);
  if (!b) problem('No se encuentra HP_BUILD en HemoPocket_app.html.');
  if (!c) problem('No se encuentra la versión del caché (hemopocket-vN) en sw.js.');
  if (b && c) {
    if (b[1] !== c[1]) problem('DESAJUSTE de versión: HP_BUILD=' + b[1] + ' pero el caché del SW es v' + c[1] + ' (ejecuta ./bump.sh).');
    else note('Versión coherente: build ' + b[1] + ' = caché SW v' + c[1] + '.');
  }
}

// 3) Reglas de Firestore: llaves balanceadas (un descuadre las rompería y bloquearía la nube).
{
  let r = '';
  try { r = fs.readFileSync(RULES, 'utf8'); } catch(e){ problem('No se puede leer firestore.rules: ' + e.message); }
  if (r) {
    const o = (r.match(/\{/g) || []).length, cl = (r.match(/\}/g) || []).length;
    if (o !== cl) problem('firestore.rules con llaves descuadradas: ' + o + ' "{" vs ' + cl + ' "}".');
    else note('firestore.rules: llaves balanceadas (' + o + ').');
  }
}

// 4) INVARIANTE DE SINCRONIZACIÓN (el más importante): toda función lectora window.hpSync*
//    debe estar incluida en la lista de sincronización EN VIVO (hpResyncContent). Si alguien
//    añade una edición nueva y olvida engancharla aquí, sus cambios no llegarían a los usuarios
//    ya conectados. Este check lo detecta automáticamente.
{
  const readers = new Set();
  const rr = /window\.hpSync([A-Za-z]+)\s*=/g; let mm;
  while ((mm = rr.exec(html))) readers.add('hpSync' + mm[1]);

  const fnsMatch = html.match(/const\s+fns\s*=\s*\[([^\]]*)\]/);
  if (!fnsMatch) {
    problem('No se encuentra la lista de sincronización en vivo (const fns=[...]) en hpResyncContent.');
  } else {
    const listed = new Set((fnsMatch[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, '')));
    // Lectores que NO van en la sync en vivo a propósito (ninguno hoy; aquí por si acaso).
    const EXCLUDE = new Set([]);
    const missing = [...readers].filter(r => !EXCLUDE.has(r) && !listed.has(r));
    if (missing.length) {
      problem('Lectores de sincronización SIN enganchar a la sync en vivo (hpResyncContent): ' +
        missing.join(', ') + '. Sus ediciones NO llegarían a dispositivos ya abiertos. Añádelos a const fns=[...].');
    } else {
      note('Sincronización en vivo: las ' + readers.size + ' colecciones editables están todas enganchadas.');
    }
    // Aviso si en la lista hay nombres que ya no existen como función (limpieza).
    const ghost = [...listed].filter(x => !readers.has(x));
    if (ghost.length) note('Aviso: en la lista de sync hay nombres sin función lectora: ' + ghost.join(', ') + '.');
  }
}

// 5) Que el saneador de contenido editado siga quitando tamaños de letra sueltos
//    (evita discrepancias de tipografía en páginas editadas, sobre todo desde iPhone).
{
  if (!/_hpSanHtml/.test(html)) problem('No se encuentra el saneador _hpSanHtml.');
  else if (!/font-size\|font-family/.test(html)) note('Aviso: no se detecta el filtrado de font-size/font-family en _hpSanHtml (revisar si se busca coherencia tipográfica).');
}

finish();

function finish(){
  const fecha = new Date().toISOString().slice(0, 10);
  let out = '# 🔍 Revisión semanal HemoPocket — ' + fecha + '\n\n';
  if (problems.length) {
    out += '## ❌ Problemas detectados (' + problems.length + ')\n';
    for (const p of problems) out += '- ' + p + '\n';
    out += '\n';
  } else {
    out += '## ✅ Todo correcto\nNo se han detectado problemas en las comprobaciones automáticas.\n\n';
  }
  if (notes.length) {
    out += '## Detalle de comprobaciones\n';
    for (const n of notes) out += '- ' + n + '\n';
  }
  process.stdout.write(out + '\n');
  process.exit(problems.length ? 1 : 0);
}
