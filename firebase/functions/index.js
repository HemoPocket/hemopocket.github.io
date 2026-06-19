// HemoPocket — Cloud Functions
// Avisa a los ADMINISTRADORES cuando un usuario crea una cuenta (solicitud de acceso) o
// envía un reporte de error: notificación PUSH (FCM) a todos los admins y, de forma
// OPCIONAL, también un correo.
//
// El correo es OPCIONAL: solo se envía si están definidas las variables de entorno
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / ADMIN_EMAIL. Si no, se omite y se
// manda únicamente el push (así el despliegue no depende de configurar el correo).
// Requiere plan Blaze. Despliegue: ver README.md (o el workflow de GitHub Actions).

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
try { admin.initializeApp(); } catch (e) {}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Correo OPCIONAL (vía variables de entorno) ──
function emailConfig() {
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER,
        pass = process.env.SMTP_PASS, to = process.env.ADMIN_EMAIL;
  if (!host || !user || !pass || !to) return null;
  return { host, port: parseInt(process.env.SMTP_PORT || '465', 10), user, pass, to };
}
async function enviarEmail(subject, html) {
  const cfg = emailConfig();
  if (!cfg) { logger.info('Correo no configurado: se omite (solo push).'); return; }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({ from: `"HemoPocket" <${cfg.user}>`, to: cfg.to, subject, html });
    logger.info('Email enviado', { subject });
  } catch (e) { logger.error('Error enviando email', e); }
}

// ── Push (FCM) a TODOS los administradores (rol 'admin' + la principal) ──
// Best-effort: cualquier fallo se registra pero no interrumpe la función.
async function pushAAdmins(title, body, url) {
  try {
    const db = admin.firestore();
    const uids = new Set(['oHgd0fQBUfQV1NxGKbFHkHNZSWz1']); // admin principal
    try {
      const rs = await db.collection('roles').where('role', '==', 'admin').get();
      rs.forEach((d) => uids.add(d.id));
    } catch (e) {}
    const tokens = [];
    for (const uid of uids) {
      try {
        const t = await db.collection('pushTokens').doc(uid).get();
        const tok = t.exists && t.data() && t.data().token;
        if (tok) tokens.push(tok);
      } catch (e) {}
    }
    if (!tokens.length) { logger.info('Push a admins: sin tokens registrados'); return; }
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      webpush: { fcmOptions: { link: url || '/' }, notification: { icon: '/icono-192.png' } },
    });
    logger.info('Push a admins enviado', { ok: res.successCount, fail: res.failureCount });
  } catch (e) {
    logger.error('Error enviando push a admins', e);
  }
}

// ── Nueva solicitud de cuenta ──
exports.avisoNuevaCuenta = onDocumentCreated(
  { document: 'cuentas/{uid}', region: 'europe-west1' },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;

    const nombre = `${d.nombre || ''} ${d.apellido || ''}`.trim() || '(sin nombre)';
    try { await pushAAdmins('Nueva solicitud de acceso', `${nombre} solicita acceso a HemoPocket.`, '/'); } catch (e) {}

    let fecha = '';
    try { fecha = d.fechaAceptacion && d.fechaAceptacion.toDate ? d.fechaAceptacion.toDate().toLocaleString('es-ES') : ''; } catch (e) {}

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;color:#333;max-width:560px">
        <h2 style="color:#c41e3a">HemoPocket · Nueva solicitud de cuenta</h2>
        <p>Se ha registrado un nuevo usuario, pendiente de tu aprobación en el apartado
        <strong>Solicitudes de acceso</strong> de la app.</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 10px 4px 0"><strong>Nombre</strong></td><td>${esc(nombre)}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>Correo</strong></td><td>${esc(d.email)}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>Aceptó los términos</strong></td><td>${d.aceptaTerminos ? 'Sí' : 'No'}${d.versionTerminos ? ` (v${esc(d.versionTerminos)})` : ''}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>Fecha de aceptación</strong></td><td>${esc(fecha)}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>UID</strong></td><td>${esc(event.params.uid)}</td></tr>
        </table>
        <p style="font-size:13px;color:#666;margin-top:16px">Esta es la copia del registro de aceptación de los Términos y Condiciones de uso de HemoPocket.
        El usuario declara entender que la herramienta es un apoyo a la consulta y que las decisiones clínicas son responsabilidad del médico responsable.</p>
      </div>`;
    await enviarEmail(`HemoPocket · Nueva solicitud de cuenta: ${nombre}`, html);

    logger.info('Aviso de nueva cuenta procesado', { uid: event.params.uid, email: d.email });
  }
);

// ── Nuevo reporte de error (solo reportes MANUALES de usuario, tipo 'usuario') ──
exports.avisoNuevoReporte = onDocumentCreated(
  { document: 'reportes/{id}', region: 'europe-west1' },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;
    if ((d.tipo || 'usuario') !== 'usuario') return;   // no avisar de 'auto' ni 'eri_miss'

    try { await pushAAdmins('Nuevo reporte de error', (d.texto || '').toString().slice(0, 140), '/'); } catch (e) {}

    let fecha = '';
    try { fecha = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString('es-ES') : ''; } catch (e) {}

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;color:#333;max-width:560px">
        <h2 style="color:#c41e3a">HemoPocket · Nuevo reporte de error</h2>
        <p>Un usuario ha enviado una incidencia o sugerencia desde la app. La tienes en el apartado
        <strong>Errores reportados</strong>.</p>
        <blockquote style="border-left:3px solid #c41e3a;margin:12px 0;padding:8px 12px;background:#faf3f4;white-space:pre-wrap">${esc(d.texto)}</blockquote>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 10px 4px 0"><strong>De</strong></td><td>${esc(d.email || '(desconocido)')}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>Sección</strong></td><td>${esc(d.vista || '—')}</td></tr>
          ${d.eriLastQ ? `<tr><td style="padding:4px 10px 4px 0"><strong>Última consulta a Eri</strong></td><td>${esc(d.eriLastQ)}</td></tr>` : ''}
          <tr><td style="padding:4px 10px 4px 0"><strong>Versión</strong></td><td>build ${esc(d.build)}${d.online === false ? ' · sin conexión' : ''}</td></tr>
          <tr><td style="padding:4px 10px 4px 0"><strong>Fecha</strong></td><td>${esc(fecha)}</td></tr>
        </table>
      </div>`;
    await enviarEmail('HemoPocket · Nuevo reporte de error', html);

    logger.info('Aviso de nuevo reporte procesado', { id: event.params.id, email: d.email });
  }
);
