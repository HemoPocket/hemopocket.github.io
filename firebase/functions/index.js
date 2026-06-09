// HemoPocket — Cloud Functions
// Envía a la administradora un correo (con copia de la aceptación de términos) cada vez
// que un usuario crea una cuenta nueva desde la app. La cuenta queda en estado
// 'pendiente' hasta que la administradora la apruebe en el panel "Solicitudes de acceso".
//
// Requiere plan Blaze. Despliegue y configuración: ver README.md de esta carpeta.

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');

// Secretos (se configuran con `firebase functions:secrets:set ...`, ver README).
const SMTP_HOST   = defineSecret('SMTP_HOST');    // p. ej. smtp.gmail.com
const SMTP_PORT   = defineSecret('SMTP_PORT');    // p. ej. 465
const SMTP_USER   = defineSecret('SMTP_USER');    // cuenta que envía
const SMTP_PASS   = defineSecret('SMTP_PASS');    // contraseña de aplicación
const ADMIN_EMAIL = defineSecret('ADMIN_EMAIL');  // a quién avisar (la administradora)

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

exports.avisoNuevaCuenta = onDocumentCreated(
  {
    document: 'cuentas/{uid}',
    region: 'europe-west1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL],
  },
  async (event) => {
    const d = event.data && event.data.data();
    if (!d) return;

    const port = parseInt(SMTP_PORT.value() || '465', 10);
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port,
      secure: port === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });

    const nombre = `${d.nombre || ''} ${d.apellido || ''}`.trim() || '(sin nombre)';
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

    await transporter.sendMail({
      from: `"HemoPocket" <${SMTP_USER.value()}>`,
      to: ADMIN_EMAIL.value(),
      subject: `HemoPocket · Nueva solicitud de cuenta: ${nombre}`,
      html,
    });

    logger.info('Aviso de nueva cuenta enviado', { uid: event.params.uid, email: d.email });
  }
);
