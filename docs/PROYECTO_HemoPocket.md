# Proyecto HemoPocket
### Herramienta de apoyo a la decisión clínica y unificación de criterios en Hematología y Hemoterapia

**Documento de presentación para las Comisiones de Calidad, de Sistemas de Información (Informática) y para la Dirección Médica.**

| | |
|---|---|
| **Denominación** | HemoPocket — Guía de consulta rápida en Hematología |
| **Autora / responsable** | Dra. María Teresa Busnego Barreto — Facultativa Especialista en Hematología y Hemoterapia |
| **Ámbito propuesto** | Servicio de Hematología y Hemoterapia — Hospital Universitario Nuestra Señora de Candelaria (HUNSC) |
| **Naturaleza** | Aplicación web progresiva (PWA) de consulta profesional, de uso interno y gratuito |
| **Estado** | En uso por el equipo facultativo; se solicita validación institucional |
| **Fecha del documento** | Junio de 2026 |
| **Versión del documento** | 1.0 |

> **Nota de alcance.** HemoPocket es una *herramienta de apoyo a la decisión clínica* (CDSS, *Clinical Decision Support System*). **No** es un dispositivo de diagnóstico ni de prescripción automática, **no** sustituye el juicio del facultativo responsable ni los protocolos oficiales del centro, y **no** almacena datos identificativos de pacientes. Este documento detalla qué es, qué aporta a la calidad asistencial y cómo se gobierna, para su evaluación por las comisiones competentes.

---

## 1. Resumen ejecutivo

HemoPocket es una aplicación de consulta rápida diseñada por y para hematólogos, que reúne en un único punto de acceso, disponible incluso sin conexión, los **algoritmos, escalas pronósticas, calculadoras, criterios diagnósticos y guías clínicas** de uso habitual en el Servicio de Hematología.

Su propósito es **reducir la variabilidad no justificada de la práctica clínica**, **unificar la terminología y los criterios** entre facultativos y turnos (especialmente en guardia y en la atención al paciente hematológico complejo), y **garantizar que el equipo trabaja siempre sobre la versión más actualizada** de los protocolos del servicio y de las guías de las sociedades científicas de referencia.

La herramienta ya integra **más de 50 calculadoras y escalas** validadas en la literatura, **algoritmos de manejo** de las principales urgencias hematológicas, un **listín telefónico interno** del centro y un repositorio de **48 guías y protocolos** organizados por área. Funciona en cualquier dispositivo (móvil, tableta u ordenador del hospital), **sin instalación obligatoria**, con acceso restringido mediante credenciales personales y **sin recoger datos clínicos de pacientes**.

Se solicita a las comisiones su revisión y, en su caso, el reconocimiento de HemoPocket como herramienta de apoyo del Servicio, con el modelo de gobernanza del contenido que se describe en este documento.

---

## 2. Justificación y necesidad

La Hematología clínica se caracteriza por:

- **Alta complejidad y especialización por subáreas** (leucemias agudas, linfomas, mieloma, trombosis y hemostasia, banco de sangre, terapia celular, citopenias, patología mieloide crónica, pediatría…), cada una con sus propias escalas, criterios y protocolos.
- **Actualización muy frecuente** de las clasificaciones y recomendaciones (ELN, ESMO, NCCN, SEHH, GELTAMO, PETHEMA, ISTH, ASTCT, EBMT, IMWG, iwCLL…), lo que dificulta que toda la información impresa o dispersa se mantenga vigente.
- **Atención urgente con alta carga cognitiva**: neutropenia febril, microangiopatías trombóticas, síndrome de liberación de citoquinas (CRS) y neurotoxicidad (ICANS) en terapia celular, reversión de anticoagulación, lisis tumoral, etc., donde decidir rápido y con criterio homogéneo impacta directamente en la seguridad del paciente.

En este contexto, la información clínica suele estar **fragmentada** (PDFs en carpetas de red, documentos en papel, calculadoras en webs externas, números de teléfono en notas personales). Esa fragmentación genera **variabilidad entre profesionales, uso de versiones desactualizadas y pérdida de tiempo** en la consulta.

**HemoPocket responde a esa necesidad** consolidando ese conocimiento en un único recurso, curado, versionado y actualizable de forma centralizada.

---

## 3. Descripción de la herramienta

### 3.1. Qué es, técnicamente

- **Aplicación web progresiva (PWA)**: se abre desde un navegador y puede "instalarse" como un icono en el dispositivo, comportándose como una app nativa, pero **sin necesidad de tiendas de aplicaciones ni de permisos de administrador** sobre el equipo.
- **Autocontenida y ligera**: la app es esencialmente un único archivo, lo que simplifica su despliegue y auditoría.
- **Funciona sin conexión** (modo *offline*): mediante un *service worker*, una vez abierta con conexión queda guardada en el dispositivo y sigue funcionando en zonas del hospital con mala cobertura. Las actualizaciones se descargan automáticamente cuando hay red (estrategia *network-first* para el contenido y *cache-first* para los recursos estáticos).
- **Multidispositivo y multiplataforma**: funciona igual en móvil, tableta y ordenador, con **modo claro/oscuro**, buscador global (atajo Ctrl+K) y accesos directos.

### 3.2. Estructura del contenido

La aplicación se organiza por **áreas funcionales del Servicio**, que se corresponden con la organización asistencial real:

- **Asistente**: asistente de quimioterapia (calendario de esquemas) y asistente de redacción de informes/analíticas.
- **Calculadoras**: conversión de opioides, QTc (Fridericia), aclaramiento de creatinina (Cockcroft-Gault), calcio corregido, ajuste por obesidad, superficie corporal, riesgo de lisis tumoral (Cairo-Bishop), HCT-CI (Sorror), ECOG, G8 de fragilidad, criterios de Light, etc.
- **Ingreso**: *check-list* de ingreso en planta (trasplante, neutropenia febril, debut de LMA…).
- **Neutropenia febril e infecciones**: algoritmo de neutropenia febril, espectro/sensibilidad antibiótica, bacteriemia por *S. aureus*, manejo de fiebre persistente, infección fúngica invasiva, duración de antibioterapia.
- **Otras urgencias hematológicas** y **Trombosis y Hemostasia**: PLASMIC, diferencial de microangiopatías, CID (ISTH), 4T (HIT), Wells, HAS-BLED, ISTH-BAT, interpretación de patrones de coagulación, *bridging* perioperatorio, reversión de anticoagulación, ROTEM, hemofilia adquirida y de urgencias, agregometría, tratamiento de la PTT.
- **Banco de Sangre**: discrepancias ABO, anticuerpos irregulares, panaglutinación, umbrales y características de transfusión de hematíes/plaquetas/plasma, optimización preoperatoria (PBM).
- **Terapia celular**: CRS y ICE/ICANS (criterios ASTCT), TASPE.
- **Leucemias agudas, patología mieloide crónica, mieloma, linfomas, LLC, citopenias y pediatría**: criterios diagnósticos y escalas pronósticas (ELN 2022/2024, IPSS-R/IPSS-M, Sokal, DIPSS, MIPSS70, IMWG, R-ISS/R2-ISS, IPSS-WM, R-IPI, FLIPI, MIPI, IPS, Ann Arbor, CLL-IPI, Binet/Rai…).
- **Citodiagnóstico**: tubos y muestras para cada estudio, seguimiento molecular/EMR, clasificaciones LMA (ICC/OMS) y de linfomas.
- **Pautas de QT (SEHH)** y **repositorio de guías clínicas** por área (48 documentos PDF).
- **Equipo y Sincronización**: créditos de los revisores y panel de estado de actualización.

Cada escala y criterio incluye, cuando procede, su **referencia bibliográfica** y la mención de la guía o sociedad de la que procede.

---

## 4. Objetivos

### 4.1. Objetivo general
Disponer de una herramienta de apoyo a la decisión clínica, unificada y actualizada, que mejore la **calidad, la seguridad y la homogeneidad** de la atención al paciente hematológico en el HUNSC.

### 4.2. Objetivos específicos
1. **Unificar criterios y terminología** clínica entre facultativos, secciones y turnos.
2. **Reducir la variabilidad no justificada** en el manejo de las situaciones más frecuentes y críticas.
3. **Garantizar el acceso a la versión vigente** de protocolos y guías, evitando el uso de documentación obsoleta.
4. **Acelerar la consulta** en el punto de atención, especialmente en urgencias y guardia.
5. **Apoyar la docencia y la incorporación de residentes y nuevos facultativos**, ofreciendo un marco de referencia común.
6. **Dejar trazabilidad** de qué versión del contenido está activa y cuándo se actualizó.

---

## 5. Aportación a la calidad asistencial y a la seguridad del paciente

| Eje de calidad | Cómo lo aborda HemoPocket |
|---|---|
| **Práctica basada en la evidencia** | Las escalas y criterios reproducen guías y publicaciones de referencia (ELN, ESMO, NCCN, SEHH, GELTAMO, PETHEMA, ISTH, ASTCT, IMWG, iwCLL), con su cita correspondiente. |
| **Reducción de la variabilidad** | Un único origen de verdad para algoritmos, umbrales y criterios, compartido por todo el equipo. |
| **Seguridad del paciente** | Calculadoras que minimizan errores de cálculo manual (dosis, aclaramiento, calcio corregido, conversión de opioides, lisis tumoral, QTc…) y *check-lists* que reducen omisiones en el ingreso. |
| **Continuidad asistencial** | Misma información para todos los turnos y dispositivos; funcionamiento *offline* en cualquier punto del hospital. |
| **Actualización continua** | El contenido se versiona y se distribuye de forma centralizada; al abrir la app con conexión, todos los equipos reciben la última versión automáticamente. |
| **Trazabilidad** | La app muestra la versión activa y la fecha de última sincronización; el historial de cambios queda registrado en el control de versiones. |
| **Docencia** | Recurso normalizado para residentes y formación continuada; incluye material de pregrado y citología. |

---

## 6. Protección de datos y cumplimiento normativo

> Este es uno de los puntos de mayor relevancia para las comisiones, por lo que se detalla con claridad.

- **No se tratan datos identificativos de pacientes.** La aplicación **no solicita ni almacena** nombre, número de historia clínica, DNI ni ningún identificador directo. Las calculadoras funcionan únicamente con parámetros clínicos no identificativos (p. ej., edad y sexo) y el resultado se muestra en pantalla para que el facultativo lo traslade, si lo desea, a su propia documentación clínica del sistema corporativo. **HemoPocket no es un repositorio de datos clínicos.**
- **Lo único que se guarda del usuario** son preferencias de uso de la propia app (elementos favoritos y vistas recientes), que se sincronizan entre los dispositivos del propio profesional. No contienen información de pacientes.
- **Acceso restringido.** El uso requiere **autenticación con credenciales personales e intransferibles** (correo y contraseña). No hay acceso anónimo a la herramienta.
- **Residencia de datos en la UE.** Los servicios de autenticación y sincronización están configurados en región europea (*europe-west*), lo que facilita el cumplimiento del RGPD.
- **Cifrado en tránsito.** Todo el tráfico se sirve sobre HTTPS.
- **Marco legal incorporado.** La app dispone de un **Aviso Legal** accesible desde la propia interfaz, que cubre autoría y titularidad, propiedad intelectual, revisión clínica, fuentes y actualización, **limitación de responsabilidad** y condiciones de uso.

En el documento de recomendaciones que acompaña a este proyecto se proponen, además, las acciones para formalizar el cumplimiento (registro de la actividad, evaluación de impacto si la Dirección lo considera, y política de privacidad explícita), que el Servicio asumiría con el apoyo del Delegado de Protección de Datos del centro.

---

## 7. Seguridad informática y arquitectura

- **Sin instalación intrusiva.** Al ser una PWA, no requiere privilegios de administrador ni instalación de software en los equipos corporativos; se accede desde el navegador.
- **Compatibilidad con la red del hospital.** El diseño tiene en cuenta las restricciones de red del centro: el contenido y las guías se sirven desde un alojamiento accesible (páginas estáticas), evitando depender de servicios que el hospital pudiera bloquear.
- **Modelo de permisos por roles.** La gestión del contenido (subir, sustituir o eliminar guías) está restringida mediante reglas de seguridad: un **administrador** y **editores por sección**, de modo que cada responsable solo puede modificar el material de su área. El resto de usuarios solo consulta.
- **Sin dependencia de un servidor propio del hospital.** La herramienta no introduce nuevos servidores que mantener en la infraestructura del centro.
- **Código auditable.** Al estar la aplicación autocontenida, su contenido puede ser revisado por el servicio de Informática.

En el documento de recomendaciones se proponen mejoras concretas para reforzar la postura de seguridad (revisión de la telemetría/analítica, control de acceso a los PDF, política de credenciales y dependencia de servicios externos).

---

## 8. Gobernanza, autoría y actualización del contenido

- **Autoría y titularidad.** HemoPocket ha sido desarrollada de forma independiente por la Dra. M. T. Busnego Barreto. La aplicación, su código, su diseño y sus contenidos originales están protegidos por la legislación de propiedad intelectual.
- **Revisión clínica por pares.** Los contenidos han sido revisados por **facultativos del Servicio de Hematología del HUNSC**, que figuran acreditados como **revisores clínicos por área** dentro de la propia aplicación (sección "Equipo" y Aviso Legal). Su participación valida el contenido sin implicar coautoría de la herramienta.
- **Modelo de actualización.** El contenido se mantiene de forma **centralizada y versionada**: cada cambio incrementa una versión y queda registrado, y los dispositivos reciben la actualización automáticamente al conectarse. Esto garantiza que **nadie trabaje con una versión obsoleta**.
- **Responsabilidad de contenidos por sección.** Cada área cuenta con responsables/revisores identificados, lo que permite un mantenimiento sostenible y distribuido.

Se propone que, en caso de validación institucional, este modelo de gobernanza se formalice mediante un **comité editorial del Servicio** (ver documento de recomendaciones).

---

## 9. Beneficios esperados e indicadores propuestos

**Beneficios cualitativos:** homogeneización de criterios, reducción de errores de cálculo, ahorro de tiempo en la consulta, mejor experiencia en guardia, apoyo a la docencia y mejor onboarding de residentes y nuevos facultativos.

**Indicadores propuestos para su seguimiento** (a acordar con la Comisión de Calidad):
- Grado de adopción (nº de facultativos con acceso activo / plantilla del Servicio).
- Nº de actualizaciones de contenido por trimestre y tiempo medio de actualización tras la publicación de una nueva guía.
- Nº de áreas con revisor clínico asignado y contenido revisado.
- Encuesta de satisfacción/utilidad percibida al equipo (semestral).
- Incidencias de seguridad o de protección de datos (objetivo: 0).

---

## 10. Plan de implantación propuesto

1. **Fase 0 — Validación institucional.** Revisión por las Comisiones de Calidad e Informática y por la Dirección Médica. Resolución de las recomendaciones (documento adjunto).
2. **Fase 1 — Formalización.** Constitución del comité editorial del Servicio, registro de la actividad de tratamiento (con el DPD), y publicación de la política de privacidad y del aviso legal definitivos.
3. **Fase 2 — Despliegue controlado.** Alta de credenciales a los facultativos del Servicio; sesión formativa breve; recogida de incidencias.
4. **Fase 3 — Uso generalizado y mantenimiento.** Actualización continua por áreas, seguimiento de indicadores y revisión periódica (p. ej., anual) por la Comisión de Calidad.

---

## 11. Limitación de responsabilidad (texto vigente en la aplicación)

> *"Esta herramienta es un apoyo a la decisión clínica. No sustituye el juicio del facultativo responsable, los protocolos oficiales del centro, ni la ficha técnica de los medicamentos."* El profesional sanitario es responsable de verificar la vigencia de la información antes de aplicarla.

---

## 12. Anexos

- **Anexo A — Inventario de contenido**: listado completo de calculadoras, escalas, algoritmos y guías (disponible en la propia aplicación, secciones del menú).
- **Anexo B — Aviso Legal**: texto íntegro accesible desde la app.
- **Anexo C — Documento de recomendaciones técnicas y de cumplimiento** (`RECOMENDACIONES_aprobacion.md`).
- **Anexo D — Relación de revisores clínicos por área** (sección "Equipo" de la app y Aviso Legal).

---

*Documento elaborado como apoyo a la presentación de HemoPocket ante las comisiones del HUNSC. Para cualquier aclaración técnica o clínica, contactar con la autora.*
