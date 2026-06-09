# HemoPocket
## Documento técnico y de seguridad para Sistemas de Información

|  |  |
|---|---|
| **A la atención de** | Servicio / Comisión de Sistemas de Información (Informática) — HUNSC |
| **Asunto** | Valoración técnica y de seguridad de HemoPocket para su uso en el ámbito asistencial |
| **Promotora** | Dra. María Teresa Busnego Barreto — F.E.A. Hematología y Hemoterapia |
| **Fecha** | Santa Cruz de Tenerife, 9 de junio de 2026 |

---

Estimado equipo de Sistemas de Información:

Adjunto la información técnica de **HemoPocket** para su valoración de seguridad y compatibilidad con la infraestructura del centro. La herramienta está **diseñada para no introducir carga ni riesgos** en la infraestructura corporativa, como se detalla a continuación.

---

## 1. Arquitectura

- **Aplicación web progresiva (PWA)** autocontenida: esencialmente **un único archivo HTML** (HTML + CSS + JavaScript), sin *framework* ni sistema de compilación.
- **Sin instalación intrusiva**: se accede desde el navegador; puede "instalarse" como icono **sin privilegios de administrador** sobre el equipo.
- **Sin servidor propio del hospital**: no añade servidores a mantener en la infraestructura del centro.
- **Funcionamiento offline** mediante *service worker*: tras la primera carga con conexión, queda disponible sin red. Estrategia *network-first* para el contenido (siempre la última versión cuando hay conexión) y *cache-first* para recursos estáticos.

## 2. Autenticación, autorización y datos

| Aspecto | Detalle |
|---|---|
| **Autenticación** | Firebase Authentication (correo + contraseña), credenciales personales e intransferibles. Sin acceso anónimo. |
| **Autorización** | Modelo por roles (administrador / editor por sección) con **reglas de seguridad** publicadas (Firestore y Storage). |
| **Datos de paciente** | **No se tratan.** Las calculadoras usan solo parámetros no identificativos (edad, sexo, peso, talla, creatinina) que **permanecen en el dispositivo** y **no se transmiten**. |
| **Datos de cuenta** | Correo y UID; preferencias de uso (favoritos/recientes) sincronizadas. Configuración en **región europea** (*europe-west*). |
| **Transporte** | Todo el tráfico sobre **HTTPS**. |
| **Telemetría** | **Ninguna.** Se ha eliminado la analítica de uso (Google Analytics) — la app no envía telemetría a terceros. |

## 3. Dependencias externas

| Dependencia | Origen | Situación |
|---|---|---|
| SDK de Firebase (Auth/DB) | `www.gstatic.com/firebasejs/...` | Necesario para el login. Se **cachea offline** vía *service worker*. **Solicitud**: confirmar que el dominio está permitido en la red asistencial. |
| Visor de PDF (pdf.js) | **Auto-alojado** en el propio dominio (`/vendor/pdfjs/pdf.min.js`) | Ya **no depende de CDN externo**; se precachea para uso offline. |
| Guías clínicas (PDF) | GitHub Pages (`hemopocket.github.io/guias/...`) | Servidas como contenido estático. Ver punto 5. |

## 4. Sobre la clave de Firebase visible en el código

La configuración web de Firebase (incluida la *API key*) aparece en el código fuente. **Esto es normal y esperado** en aplicaciones de navegador: no es un secreto y **no concede acceso por sí misma**; la seguridad recae en las **reglas de Firestore/Storage** y en **Authentication**.

**Medidas de refuerzo propuestas** (configuración en consola, sin cambios de arquitectura):

- Activar **Firebase App Check**.
- **Restringir la API key por referrer HTTP** (dominios autorizados).
- Revisión periódica de las reglas de seguridad.

## 5. Punto a resolver con Informática

Los **PDF de guías** se sirven actualmente como contenido **estático y público** en GitHub Pages (aunque la *interfaz* de la app exija login, una URL directa al PDF sería accesible). Dado que el código documenta que **la red del hospital bloquea Firebase Storage** pero permite `github.io`, se eligió este alojamiento.

**Solicitud**: valorar conjuntamente la alternativa más adecuada (mantener el alojamiento estático confirmando la licencia de difusión de los documentos, o trasladar los PDF a un alojamiento con control de acceso compatible con la red del centro).

## 6. Compatibilidad y despliegue

- **Distribución actual**: `https://hemopocket.github.io` (GitHub Pages), con redirección desde Vercel.
- **Instalable** como PWA en Android, iOS (16.4+) y Windows.
- **Código auditable**: al estar autocontenida, Informática puede revisar su contenido.
- Si se opta por adopción institucional, puede valorarse **alojamiento controlado por el centro** y el encaje en el **Esquema Nacional de Seguridad (ENS)**.

## 7. Solicitud a Sistemas de Información

1. **Validación técnica y de seguridad** de la herramienta para su uso asistencial.
2. **Confirmar la disponibilidad** de los dominios necesarios en la red (`gstatic.com`) y **probar el modo offline** en los equipos.
3. **Acordar la solución de alojamiento de los PDF** (punto 5).
4. **Apoyo para activar** App Check y la restricción de la API key.

Quedo a su disposición para una revisión técnica conjunta y para facilitar el acceso al código y a la configuración.

Atentamente,

**Dra. María Teresa Busnego Barreto**
Facultativa Especialista en Hematología y Hemoterapia
Servicio de Hematología y Hemoterapia — HUNSC
