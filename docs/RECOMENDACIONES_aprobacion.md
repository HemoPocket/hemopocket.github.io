# HemoPocket — Recomendaciones para la aprobación institucional

**Documento técnico de apoyo a la evaluación por las Comisiones de Calidad, de Sistemas de Información (Informática) y por la Dirección Médica del HUNSC.**

Este documento acompaña al `PROYECTO_HemoPocket.md`. Recoge, de forma honesta y priorizada, los **puntos fuertes** de la aplicación, las **brechas** detectadas en una revisión del código y la configuración, y las **acciones concretas recomendadas** para superar con garantías la evaluación de cada comisión.

> Las acciones se clasifican por prioridad:
> 🔴 **Imprescindible** (debería resolverse antes de la aprobación) · 🟡 **Recomendable** (refuerza la solicitud) · 🟢 **Mejora** (a medio plazo).

---

## 0. Resumen de la valoración

**HemoPocket llega a la evaluación en una posición sólida:** es una PWA autocontenida, funciona sin conexión, **no almacena datos identificativos de pacientes**, exige autenticación personal, sitúa los datos de cuenta en región europea, dispone de un Aviso Legal completo y de revisión clínica por pares del propio Servicio.

Las acciones pendientes son, en su mayoría, de **formalización documental y de configuración**, no de rediseño. A continuación se detallan por bloques.

---

## 0 bis. Cambios ya aplicados en el código (esta versión)

Como parte de esta revisión, ya se han implementado en la aplicación las siguientes mejoras técnicas. El resto de acciones (documentales y organizativas) se detallan en los bloques siguientes.

| Mejora | Bloque | Detalle |
|---|---|---|
| ✅ **Analítica de uso desactivada** | A | Se ha eliminado Google Analytics for Firebase. La app **ya no envía telemetría de uso a terceros**. |
| ✅ **Sección de Privacidad en la app** | A | El Aviso Legal incluye ahora un apartado "Privacidad y protección de datos" que explicita que no se tratan datos de pacientes, qué se almacena y la recomendación de no introducir datos identificativos. |
| ✅ **Aceptación del Aviso Legal en el primer uso** | C | Tras el primer inicio de sesión, el usuario debe confirmar ("He leído y acepto") antes de usar la herramienta. Queda registrado en el dispositivo. |
| ✅ **Visor de PDF auto-alojado** | B | `pdf.js` se sirve desde el propio dominio (antes desde un CDN externo). Elimina el punto único de fallo y **permite abrir las guías sin conexión**. El *service worker* lo precachea. |

> Las acciones que siguen marcadas como pendientes (🔴/🟡/🟢) son las que requieren intervención documental, jurídica o de configuración en consola (DPD, DPA, registro de actividad, App Check, etc.), que no pueden resolverse solo desde el código.

---

## Bloque A — Protección de datos (RGPD / LOPDGDD)

### Lo que ya está bien ✅
- **No se tratan datos identificativos de pacientes.** Verificado en el código: el único estado "de paciente" que maneja la app son parámetros clínicos **no identificativos** (edad, sexo, peso, talla, creatinina) usados por las calculadoras. **No** se solicita ni guarda nombre, NHC, DNI ni diagnóstico nominativo.
- Esos parámetros se guardan **solo en el dispositivo** (almacenamiento local) y **no se transmiten** a ningún servidor: la sincronización en la nube se limita a *favoritos* y *elementos recientes*.
- El acceso exige **credenciales personales** (correo + contraseña) mediante Firebase Authentication.
- Los datos de cuenta y sincronización están configurados en **región europea** (*europe-west*).

### Brechas y acciones

| Prio | Acción |
|---|---|
| 🔴 | **Política de privacidad explícita.** ✅ *Parcialmente hecho*: el Aviso Legal ya incluye una sección "Privacidad y protección de datos" en la app. **Pendiente** de formalizar con el DPD el documento completo: base jurídica, responsable, encargado (Google/Firebase), conservación, derechos del interesado y vía de ejercicio. |
| 🔴 | **Registro de la actividad de tratamiento.** Con el apoyo del **Delegado de Protección de Datos (DPD)** del centro, inscribir el tratamiento de "datos de cuenta de profesionales usuarios" en el Registro de Actividades de Tratamiento. |
| 🔴 | **Contrato de encargado / DPA.** Documentar el acuerdo de tratamiento de datos con Google (Firebase) y verificar las garantías de transferencia internacional (los servicios de autenticación de Google pueden implicar tratamiento fuera de la UE pese a la región del dato). |
| ✅ | **Analítica de uso desactivada (hecho).** Se ha eliminado Google Analytics for Firebase; la app ya no envía telemetría de uso a terceros. |
| 🟡 | **Aviso "no introducir datos de paciente".** Añadir un recordatorio visible en los campos de las calculadoras indicando que no deben introducirse datos identificativos (refuerza el diseño *privacy-by-default* ya existente). |
| 🟢 | **Evaluación de impacto (EIPD/DPIA).** Previsiblemente **no es exigible** al no tratarse datos de salud de pacientes; aun así, conviene dejar constancia escrita de esa valoración (umbral no alcanzado) avalada por el DPD. |

---

## Bloque B — Seguridad informática (Comisión de Informática)

### Lo que ya está bien ✅
- **PWA sin instalación intrusiva**: no requiere privilegios de administrador en los equipos.
- **Modelo de permisos por roles** (admin / editor por sección) con **reglas de seguridad** en Firestore y Storage revisables (`/firebase/*.rules`).
- **HTTPS** en todo el tráfico; **funcionamiento offline** robusto mediante *service worker*.
- **Código autocontenido y auditable** en un repositorio público.
- Diseño consciente de las restricciones de red del hospital (las guías se sirven desde alojamiento estático accesible).

### Brechas y acciones

| Prio | Acción |
|---|---|
| 🔴 | **Acceso a los PDF de guías.** Los 48 PDF de `guias/` se sirven en **GitHub Pages de forma pública** (URL directa accesible sin login), aunque la *interfaz* de la app exija autenticación. Como muchos son documentos de sociedades científicas con derechos de terceros, conviene: (a) confirmar la licencia/permiso de difusión pública de cada documento, o (b) trasladar los PDF a un alojamiento con control de acceso. *Nota: el código documenta que la red del hospital bloquea Firebase Storage, de ahí el alojamiento actual; debe valorarse con Informática la alternativa viable.* |
| 🟡 | **Dependencias externas.** ✅ **pdf.js ya se auto-aloja** en el propio dominio (`/vendor/pdfjs/pdf.min.js`), eliminando la dependencia del CDN y habilitando el visor offline. Queda pendiente: que Informática **confirme que `gstatic.com` (SDK de Firebase) está permitido** en la red asistencial (ya se cachea offline vía *service worker*). |
| 🟡 | **Endurecer Firebase.** La clave web de Firebase es visible en el código fuente —**esto es normal y esperado** en apps de navegador; la seguridad recae en las reglas y en Auth—. Reforzar con: **Firebase App Check**, **restricción de la API key por referrer HTTP** y revisión periódica de las reglas. |
| 🟡 | **Política de credenciales.** Definir requisitos de contraseña, proceso de alta/baja de usuarios (sincronizado con altas/bajas del Servicio) y valorar **verificación en dos pasos (MFA)** para las cuentas con rol de edición. |
| 🟢 | **Alojamiento.** El despliegue actual es GitHub Pages / Vercel (proveedores fuera de la UE). Si la institución adopta la herramienta como propia, valorar alojamiento controlado por el centro y, en su caso, encaje con el **Esquema Nacional de Seguridad (ENS)**. |
| 🟢 | **Alertas de coste.** Configurar alertas de presupuesto en la consola de Google Cloud (previsto ~0 € para el volumen del Servicio, pero conviene el control). |

---

## Bloque C — Calidad y gobernanza clínica (Comisión de Calidad)

### Lo que ya está bien ✅
- Contenido basado en guías de referencia (ELN, ESMO, NCCN, SEHH, GELTAMO, PETHEMA, ISTH, ASTCT, IMWG, iwCLL) **con citas bibliográficas**.
- **Revisión clínica por pares** del propio Servicio: revisores acreditados por área en la app y en el Aviso Legal.
- **Limitación de responsabilidad** clara: herramienta de apoyo, no sustituye juicio clínico, protocolos del centro ni ficha técnica.
- Contenido **versionado** y distribución centralizada de actualizaciones.

### Brechas y acciones

| Prio | Acción |
|---|---|
| 🔴 | **Procedimiento documentado de actualización (SOP).** Formalizar por escrito: quién revisa cada área, con qué periodicidad, cómo se valida un cambio antes de publicarlo y cómo se comunica. Esto convierte la "actualización continua" en un proceso auditable. |
| 🔴 | **Comité editorial del Servicio.** Designar responsables/revisores por área (ya existen de facto) con un acta que respalde la gobernanza del contenido y la **declaración de conflictos de interés** de los revisores. |
| 🟡 | **Trazabilidad por unidad de contenido.** Mostrar en cada escala/algoritmo la **fecha de última revisión** y la **versión de la guía fuente**, además de un **historial de cambios** (*changelog*) accesible al usuario desde la app. |
| 🟡 | **Validación de cálculos.** Documentar que cada calculadora reproduce fielmente la fórmula publicada (lista de verificación firmada por los revisores). Opcional: una pequeña prueba de validación/usabilidad interna con casos de control. |
| 🟡 | **Implicación formal del Servicio de Farmacia.** Para dosis y conversiones (opioides, antifúngicos, antibióticos, reversión de anticoagulación), validar la concordancia con la **ficha técnica** y los protocolos de Farmacia del centro (ya figura un farmacéutico entre los contactos). |
| ✅ | **Aceptación del Aviso Legal en el primer uso (hecho).** Se requiere confirmación (*click-through*) en el primer uso tras iniciar sesión, evidenciando el uso informado de la herramienta como apoyo. |

---

## Bloque D — Accesibilidad

### Lo que ya está bien ✅
- Etiquetas **ARIA** en los controles principales, **roles de diálogo** (`role="dialog" aria-modal`), estructura semántica, **modo oscuro**, diseño *responsive* y **navegación por teclado** (atajo Ctrl+K, cierre con Escape).

### Brechas y acciones

| Prio | Acción |
|---|---|
| 🟡 | **Auditoría WCAG 2.1 AA** y publicación de una **declaración de accesibilidad**. Si la herramienta se considera de sector público, aplica el **RD 1112/2018**. La base ya está bien orientada; falta la verificación formal. |
| 🟢 | **Contraste y tamaño de fuente.** Revisar ratios de contraste en ambos temas y ofrecer escalado de texto. |

---

## Bloque E — Sostenibilidad y continuidad

| Prio | Acción |
|---|---|
| 🔴 | **Riesgo de autor único.** Designar **mantenedores de respaldo**, garantizar el **acceso del Servicio al repositorio y a la consola de Firebase**, y documentar la base de código. Definir un plan de contingencia si la autora no estuviera disponible. |
| 🟡 | **Copia de seguridad y recuperación.** Procedimiento de respaldo del contenido (repositorio + base de datos de guías/roles) y de las credenciales de administración. |
| 🟡 | **Prueba en la red del hospital.** Verificar formalmente el funcionamiento (login, sincronización y modo offline) desde los equipos y la red asistencial reales. |
| 🟢 | **Plan de retirada/sustitución** ordenado, por si en el futuro se decidiera integrar el contenido en otra plataforma corporativa. |

---

## Bloque F — Encaje institucional y marco de relación

El Aviso Legal actual declara expresamente que HemoPocket **no es un producto oficial del HUNSC**. Si la institución decide respaldarla, conviene **aclarar por escrito el modelo de relación**, porque condiciona la responsabilidad y la propiedad intelectual:

- **Opción 1 — Reconocimiento de uso**: el centro autoriza/recomienda su uso como herramienta de apoyo, manteniéndose la titularidad en la autora. *(Menor implicación institucional; rápida.)*
- **Opción 2 — Adopción institucional**: el centro asume la herramienta como recurso del Servicio, con acuerdo de cesión/licencia, gobernanza y mantenimiento corporativos. *(Mayor implicación; requiere acuerdo de propiedad intelectual y, probablemente, encaje en ENS y en los sistemas corporativos.)*

> 🔴 **Acción**: decidir, con la Dirección Médica, cuál de los dos modelos se persigue, ya que determina varias de las acciones anteriores (alojamiento, DPA, ENS, IP).

---

## Tabla resumen de acciones imprescindibles (🔴)

| # | Bloque | Acción | Responsable propuesto |
|---|---|---|---|
| 1 | A | Política de privacidad explícita | Autora + DPD |
| 2 | A | Registro de actividad de tratamiento | DPD |
| 3 | A | DPA / transferencias con Google | DPD + Informática |
| 4 | B | Resolver acceso/licencia de los PDF públicos | Autora + Informática + Asesoría jurídica |
| 5 | C | Procedimiento documentado de actualización (SOP) | Comité editorial del Servicio |
| 6 | C | Constituir comité editorial + conflictos de interés | Jefatura de Servicio |
| 7 | E | Mantenedores de respaldo y acceso del Servicio | Jefatura de Servicio |
| 8 | F | Decidir modelo de relación institucional | Dirección Médica |

---

## Conclusión

HemoPocket es **técnica y clínicamente sólida** y parte de un diseño respetuoso con la privacidad (sin datos de pacientes, acceso autenticado, datos en la UE, funcionamiento offline). Las acciones pendientes son fundamentalmente de **formalización documental, configuración de seguridad y gobernanza**, todas abordables sin rediseñar la aplicación.

Resolviendo en primer lugar las acciones marcadas como 🔴, la herramienta se presenta ante las comisiones con un **expediente completo y coherente** con los criterios de calidad asistencial, seguridad de la información y protección de datos del centro.
