#!/usr/bin/env node
// Revisión automática de salud de HemoPocket.
//
// Detecta problemas que romperían la app o impedirían que las ediciones lleguen a todos.
// Cada hallazgo lleva un CÓDIGO estable y una explicación en lenguaje claro.
//
// Con --fix, CORRIGE automáticamente lo que es SEGURO (mecánico, sin tocar lógica de la app)
// y deja solo para APROBACIÓN de un administrador lo que requiere criterio humano.
//
// Uso:
//   node scripts/health-check.mjs          (solo revisa; sale 1 si hay algo pendiente)
//   node scripts/health-check.mjs --fix     (revisa, autocorrige lo seguro, y reporta)
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const FIX = process.argv.includes('--fix');
const root = new URL('..', import.meta.url).pathname;
const APP = root + 'HemoPocket_app.html';
const SW = root + 'sw.js';
const RULES = root + 'firebase/firestore.rules';

const corregidos = [];   // autocorregidos en esta ejecución
const pendientes = [];   // requieren aprobación de un administrador
const comprobaciones = [];
let buildNum = null;

const readHtml = () => fs.readFileSync(APP, 'utf8');

// ── Comprobación 1: sintaxis del código ───────────────────────────────────────────────
function checkSyntax(html){
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0, bad = 0;
  while ((m = re.exec(html))) {
    i++;
    if (/\bsrc=/.test(m[1] || '')) continue;
    const code = m[2].replace(/^\s*import\b[^;]*;?\s*$/gm, '').replace(/^\s*export\b/gm, '');
    try { new Function(code); }
    catch (e) {
      bad++;
      pendientes.push({
        code: 'COD-SINTAXIS',
        titulo: 'Hay un error de programación en la app',
        detalle: 'Un bloque de código (#' + i + ') tiene un fallo de sintaxis: «' + e.message +
          '». La app podría no cargar. Requiere corrección manual de un técnico (díselo a Claude con el código COD-SINTAXIS).'
      });
    }
  }
  comprobaciones.push('Código revisado: ' + i + ' bloques' + (bad ? (' — ' + bad + ' con error') : ' (todos correctos)'));
}

// ── Comprobación 2: versión (para que la actualización llegue a los dispositivos) ──────
// AUTOCORREGIBLE: si el código y el caché tienen distinto número, se igualan con ./bump.sh.
function checkVersion(){
  let html = readHtml();
  let sw = '';
  try { sw = fs.readFileSync(SW, 'utf8'); } catch (e) {
    pendientes.push({ code: 'VER-SW', titulo: 'No se puede leer el service worker', detalle: 'No se encontró sw.js: ' + e.message }); return;
  }
  let b = html.match(/const HP_BUILD = (\d+);/);
  let c = sw.match(/hemopocket-v(\d+)/);
  if (b) buildNum = parseInt(b[1], 10);
  if (!b || !c) { pendientes.push({ code: 'VER-FALTA', titulo: 'Falta el número de versión', detalle: 'No se encuentra HP_BUILD o la versión del caché.' }); return; }

  if (b[1] !== c[1]) {
    if (FIX) {
      try {
        execSync('./bump.sh', { cwd: root, stdio: 'pipe' });
        const nb = readHtml().match(/const HP_BUILD = (\d+);/);
        if (nb) buildNum = parseInt(nb[1], 10);
        corregidos.push({
          code: 'VER-DESAJUSTE',
          titulo: 'Corregido: la actualización ya llegará a todos los dispositivos',
          detalle: 'El número de versión del código y del caché no coincidían (los dispositivos no recibían la versión nueva). Se han igualado automáticamente (ahora build ' + buildNum + ').'
        });
      } catch (e) {
        pendientes.push({ code: 'VER-DESAJUSTE', titulo: 'La actualización no llegaría a los dispositivos', detalle: 'El código (build ' + b[1] + ') y el caché (v' + c[1] + ') no coinciden y no se pudo corregir solo: ' + e.message });
      }
    } else {
      pendientes.push({ code: 'VER-DESAJUSTE', titulo: 'La actualización no llegaría a los dispositivos', detalle: 'El código (build ' + b[1] + ') y el caché (v' + c[1] + ') no coinciden. Se corrige igualándolos (./bump.sh).' });
    }
  } else {
    comprobaciones.push('Versión coherente: build ' + b[1] + ' = caché v' + c[1] + '.');
  }
}

// ── Comprobación 3: reglas de seguridad de la nube ─────────────────────────────────────
function checkRules(){
  let r = '';
  try { r = fs.readFileSync(RULES, 'utf8'); } catch (e) {
    pendientes.push({ code: 'REGLAS-FALTA', titulo: 'No se pueden leer las reglas de seguridad', detalle: 'No se encontró firestore.rules: ' + e.message }); return;
  }
  const o = (r.match(/\{/g) || []).length, cl = (r.match(/\}/g) || []).length;
  if (o !== cl) {
    pendientes.push({
      code: 'REGLAS-LLAVES',
      titulo: 'Las reglas de seguridad de la nube están mal cerradas',
      detalle: 'Hay ' + o + ' «{» y ' + cl + ' «}» (descuadradas). Podrían bloquear la nube. Requiere revisión de un técnico (código REGLAS-LLAVES).'
    });
  } else {
    comprobaciones.push('Reglas de seguridad: correctas (' + o + ' bloques).');
  }
}

// ── Comprobación 4 (la más importante): que TODA edición llegue a los usuarios ─────────
// Si una colección editable (hpSync*) no está en la lista de sincronización en vivo, sus
// cambios no llegarían a dispositivos ya abiertos. Requiere aprobación (toca lógica de la app).
function checkSync(html){
  const readers = new Set();
  const rr = /window\.hpSync([A-Za-z]+)\s*=/g; let mm;
  while ((mm = rr.exec(html))) readers.add('hpSync' + mm[1]);
  const fnsMatch = html.match(/const\s+fns\s*=\s*\[([^\]]*)\]/);
  if (!fnsMatch) {
    pendientes.push({ code: 'SYNC-LISTA', titulo: 'No se encuentra la lista de sincronización', detalle: 'No aparece la lista «const fns=[…]» de sincronización en vivo.' });
    return;
  }
  const listed = new Set((fnsMatch[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, '')));
  const EXCLUDE = new Set([]); // lectores que a propósito NO van en la sync en vivo (ninguno hoy)
  const missing = [...readers].filter(r => !EXCLUDE.has(r) && !listed.has(r));
  if (missing.length) {
    pendientes.push({
      code: 'SYNC-FALTA',
      titulo: 'Una edición podría NO llegar a los usuarios',
      detalle: 'Hay ediciones sin conectar a la sincronización en vivo: ' + missing.join(', ') +
        '. Sus cambios no llegarían a dispositivos ya abiertos. Hay que añadirlas a la lista «fns» ' +
        '(díselo a Claude con el código SYNC-FALTA y los nombres, y lo conecta).'
    });
  } else {
    comprobaciones.push('Sincronización en vivo: las ' + readers.size + ' colecciones editables están todas conectadas.');
  }
  const ghost = [...listed].filter(x => !readers.has(x));
  if (ghost.length) comprobaciones.push('Aviso menor: en la lista de sync hay nombres sin función: ' + ghost.join(', ') + '.');
}

// ── Ejecutar ───────────────────────────────────────────────────────────────────────────
try { readHtml(); }
catch (e) { pendientes.push({ code: 'APP-FALTA', titulo: 'No se puede leer la app', detalle: 'No se encontró HemoPocket_app.html: ' + e.message }); finish(); }

checkSyntax(readHtml());
checkVersion();          // puede autocorregir con --fix
checkRules();
checkSync(readHtml());   // re-lee por si la versión cambió el archivo

finish();

function finish(){
  const ahora = new Date().toISOString();
  const ok = pendientes.length === 0;

  // Informe legible por la APP (panel de administradores).
  try {
    fs.mkdirSync(root + 'revisiones', { recursive: true });
    fs.writeFileSync(root + 'revisiones/ultima.json', JSON.stringify({
      fecha: ahora, build: buildNum, ok,
      corregidos, pendientes, comprobaciones
    }, null, 2) + '\n');
  } catch (e) { /* no romper la revisión por no poder escribir el informe */ }

  // Salida legible (para el log y el issue de GitHub).
  let out = '# 🔍 Revisión HemoPocket — ' + ahora.slice(0, 10) + '\n\n';
  if (corregidos.length) {
    out += '## 🔧 Corregido automáticamente (' + corregidos.length + ')\n';
    for (const c of corregidos) out += '- [' + c.code + '] ' + c.titulo + ' — ' + c.detalle + '\n';
    out += '\n';
  }
  if (pendientes.length) {
    out += '## ⚠️ Necesita aprobación de un administrador (' + pendientes.length + ')\n';
    for (const p of pendientes) out += '- [' + p.code + '] ' + p.titulo + ' — ' + p.detalle + '\n';
    out += '\n';
  }
  if (ok) out += '## ✅ Sin problemas pendientes\n\n';
  if (comprobaciones.length) {
    out += '## Comprobaciones\n';
    for (const n of comprobaciones) out += '- ' + n + '\n';
  }
  process.stdout.write(out + '\n');
  process.exit(ok ? 0 : 1);
}
