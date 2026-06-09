# Aviso por correo de nuevas cuentas (Cloud Functions)

Esta función envía a la administradora un **correo con la copia de la aceptación de términos**
cada vez que alguien crea una cuenta nueva desde la app. La cuenta queda **pendiente** hasta
que la apruebes en el apartado *Solicitudes de acceso* de HemoPocket.

> El **panel de la app** funciona sin esto: ya puedes ver y aprobar las solicitudes, y el
> registro de aceptación queda guardado en Firestore. Esta función **solo añade el aviso por
> correo**. Requiere el plan **Blaze** de Firebase (tiene cuota gratuita amplia; el envío de
> unos pocos correos al mes queda, en la práctica, en 0 €).

## Requisitos previos

- Tener instalada la **Firebase CLI**: `npm install -g firebase-tools` y `firebase login`.
- Proyecto en plan **Blaze** (Functions lo exige).
- Una cuenta de correo para **enviar** los avisos. Con Gmail, crea una **contraseña de
  aplicación** (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de
  aplicaciones); no uses tu contraseña normal.

## Pasos

1. **Inicializa Functions** en la raíz del repositorio (si no existe `firebase.json`):
   ```bash
   firebase init functions
   ```
   Elige el proyecto `hemopocket`, lenguaje **JavaScript**, y **no** sobrescribas los
   archivos si te pregunta (ya están en `firebase/functions/`). Si prefieres, copia
   `index.js` y `package.json` de esta carpeta a la carpeta `functions/` que cree la CLI.

2. **Instala dependencias**:
   ```bash
   cd functions
   npm install
   ```

3. **Configura los secretos** (te los pedirá uno a uno):
   ```bash
   firebase functions:secrets:set SMTP_HOST     # p. ej. smtp.gmail.com
   firebase functions:secrets:set SMTP_PORT     # p. ej. 465
   firebase functions:secrets:set SMTP_USER     # tu correo emisor
   firebase functions:secrets:set SMTP_PASS     # la contraseña de aplicación
   firebase functions:secrets:set ADMIN_EMAIL   # a dónde quieres recibir el aviso
   ```

4. **Despliega**:
   ```bash
   firebase deploy --only functions
   ```

5. **Prueba**: crea una cuenta de prueba desde la app. Debes recibir el correo y ver la
   solicitud en *Solicitudes de acceso*.

## Notas

- La función está fijada a la región **europe-west1** (coherente con tu base de datos).
- Si cambias de proveedor de correo, solo tienes que actualizar los secretos y volver a
  desplegar; no hace falta tocar el código.
- Recuerda **publicar las reglas de Firestore** actualizadas (`firebase/firestore.rules`),
  que incluyen la colección `cuentas`.
