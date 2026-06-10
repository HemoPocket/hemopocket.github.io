#!/usr/bin/env node
// HemoPocket — Migración única de cuentas existentes
// ---------------------------------------------------
// Crea una ficha en la colección 'cuentas' con estado 'aprobada' para CADA usuario
// que ya exista en Firebase Authentication. Así, cuando se active el modo estricto de
// las reglas (quitando "|| !hasAccount()"), los usuarios actuales siguen teniendo acceso.
//
// Es IDEMPOTENTE: si un usuario ya tiene ficha en 'cuentas', NO la toca.
// Usa el Admin SDK (privilegios de servidor), por lo que ignora las reglas de seguridad.
//
// Uso:  node migrar_cuentas.js            (aplica los cambios)
//       node migrar_cuentas.js --dry-run  (solo muestra lo que haría, sin escribir)
// Configuración y requisitos: ver README.md de esta carpeta.

const admin = require('firebase-admin');
const path = require('path');

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(KEY);
} catch (e) {
  console.error('No se encontró la clave de servicio.');
  console.error('Coloca "serviceAccountKey.json" en esta carpeta o define GOOGLE_APPLICATION_CREDENTIALS.');
  console.error('Ver README.md.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Separa el displayName en nombre + apellidos; si no hay, usa la parte local del correo.
function splitName(displayName, email) {
  const dn = (displayName || '').trim();
  if (dn) {
    const parts = dn.split(/\s+/);
    const nombre = parts.shift() || '';
    return { nombre, apellido: parts.join(' ') };
  }
  return { nombre: (email || '').split('@')[0] || '', apellido: '' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  let total = 0, creados = 0, saltados = 0;
  let pageToken;

  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      total++;
      const ref = db.collection('cuentas').doc(u.uid);
      const snap = await ref.get();
      if (snap.exists) { saltados++; continue; }

      const { nombre, apellido } = splitName(u.displayName, u.email);
      const data = {
        email: u.email || '',
        nombre,
        apellido,
        estado: 'aprobada',
        // Cuenta preexistente: el acceso se concede por migración. La aceptación de
        // términos en la app (si procede) se registrará en su próximo uso.
        aceptaTerminos: false,
        versionTerminos: 'preexistente',
        migrado: true,
        fechaRevision: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`${dryRun ? '[dry-run] ' : ''}Aprobar (migrar): ${u.email || u.uid}`);
      if (!dryRun) await ref.set(data, { merge: true });
      creados++;
    }
    pageToken = res.pageToken;
  } while (pageToken);

  console.log(`\nUsuarios totales: ${total} · fichas creadas: ${creados} · ya existían (saltados): ${saltados}` +
    (dryRun ? '   (DRY RUN: no se escribió nada)' : ''));
}

main().then(() => process.exit(0)).catch((e) => { console.error('Error:', e); process.exit(1); });
