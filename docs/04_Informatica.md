# HemoPocket
## Documento técnico y de seguridad en el marco del proyecto de mejora de la calidad

|  |  |
|---|---|
| **A la atención de** | Servicio / Comisión de Sistemas de Información (Informática) — HUNSC |
| **Asunto** | Valoración técnica y de seguridad en el marco del proyecto "Implantación y evaluación de una herramienta de apoyo a la decisión clínica en Hematología" |
| **Promotora / IP** | Dra. María Teresa Busnego Barreto — F.E.A. Hematología y Hemoterapia |
| **Documento adjunto** | Protocolo de Investigación y Mejora de la Calidad |
| **Fecha** | Santa Cruz de Tenerife, 9 de junio de 2026 |

---

Estimado equipo de Sistemas de Información:

En el marco del proyecto de mejora de la calidad **«Implantación y evaluación de una herramienta de apoyo a la decisión clínica en Hematología»** (protocolo adjunto), solicito su **valoración técnica y de seguridad** de la herramienta **HemoPocket**. Está diseñada para **no introducir carga ni riesgos** en la infraestructura corporativa, como se detalla a continuación. Su validación es un requisito previo a la fase de implantación del proyecto.

---

## 1. Arquitectura

- **Aplicación web progresiva (PWA)** autocontenida (HTML + CSS + JavaScript), sin *framework* ni sistema de compilación.
- **Sin instalación intrusiva**: se accede desde el navegador; puede "instalarse" como icono **sin privilegios de administrador**.
- **Sin servidor propio del hospital**: no añade servidores a mantener.
- **Funcionamiento offline** mediante *service worker* (network-first para contenido; cache-first para recursos estáticos).

## 2. Autenticación, autorización y datos

| Aspecto | Detalle |
|---|---|
| **Autenticación** | Firebase Authentication (correo + contraseña); credenciales personales e intransferibles; sin acceso anónimo. |
| **Autorización** | Modelo por roles (administrador / editor por sección) con reglas de seguridad publicadas. |
| **Datos de paciente** | **No se tratan.** Las calculadoras usan solo parámetros no identificativos (edad, sexo, peso, talla, creatinina) que **permanecen en el dispositivo**. |
| **Datos de cuenta** | Correo y UID; preferencias de uso (favoritos/recientes). Configuración en **región europea**. |
| **Transporte** | Todo el tráfico sobre **HTTPS**. |
| **Telemetría** | **Ninguna.** Se ha eliminado la analítica de uso. *Implicación para el proyecto:* la adopción se medirá por **cuentas activas y autodeclaración**, no por rastreo. |

## 3. Dependencias externas

| Dependencia | Origen | Situación |
|---|---|---|
| SDK de Firebase (Auth/DB) | `www.gstatic.com/firebasejs/...` | Necesario para el login; se **cachea offline**. **Solicitud:** confirmar que el dominio está permitido en la red asistencial. |
| Visor de PDF (pdf.js) | **Auto-alojado** en el propio dominio (`/vendor/pdfjs/pdf.min.js`) | Ya **no depende de CDN externo**; se precachea para uso offline. |
| Guías clínicas (PDF) | GitHub Pages (`hemopocket.github.io/guias/...`) | Contenido estático. Ver punto 5. |

## 4. Sobre la clave de Firebase visible en el código

La configuración web de Firebase (incluida la *API key*) aparece en el código fuente. **Esto es normal y esperado** en aplicaciones de navegador: no es un secreto y no concede acceso por sí misma; la seguridad recae en las **reglas** y en **Authentication**.

**Medidas de refuerzo propuestas** (configuración en consola): activar **Firebase App Check**, **restringir la API key por referrer HTTP** y revisar periódicamente las reglas.

## 5. Punto a resolver con Informática

Los **PDF de guías** se sirven actualmente como contenido **estático y público** en GitHub Pages. Dado que el código documenta que la red del hospital **bloquea Firebase Storage** pero permite `github.io`, se eligió este alojamiento. **Solicitud:** valorar conjuntamente la alternativa más adecuada (mantenerlo confirmando la licencia de difusión de los documentos, o trasladar los PDF a un alojamiento con control de acceso compatible con la red).

## 6. Compatibilidad y despliegue

- **Distribución actual**: `https://hemopocket.github.io` (GitHub Pages), con redirección desde Vercel.
- **Instalable** como PWA en Android, iOS (16.4+) y Windows.
- **Código auditable**.
- Si se opta por la **adopción institucional** (Opción B ante Dirección), puede valorarse **alojamiento controlado por el centro** y el encaje en el **Esquema Nacional de Seguridad (ENS)**.

## 7. Solicitud a Sistemas de Información

1. **Validación técnica y de seguridad** para su uso asistencial (requisito previo a la implantación del proyecto).
2. **Confirmar la disponibilidad** de los dominios necesarios (`gstatic.com`) y **probar el modo offline** en los equipos.
3. **Acordar la solución de alojamiento de los PDF** (punto 5).
4. **Apoyo para activar** App Check y la restricción de la API key.

Quedo a su disposición para una revisión técnica conjunta y para facilitar el acceso al código y a la configuración.

Atentamente,

**Dra. María Teresa Busnego Barreto**
Facultativa Especialista en Hematología y Hemoterapia
Servicio de Hematología y Hemoterapia — HUNSC
