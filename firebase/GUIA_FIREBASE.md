# Delegar la subida de guías por secciones (Firebase)

Objetivo: que ciertos usuarios (banco de sangre, trombosis, etc.) puedan
**subir / sustituir / eliminar** los PDF de **su** sección desde la propia app,
y que el cambio llegue a todos automáticamente, sin pasar por GitHub.

Reutilizamos el Firebase que la app YA usa (proyecto `hemopocket`: Auth + login).
Solo hay que añadir **dónde guardar los PDF** (Cloud Storage) y **dónde guardar
el listado y los permisos** (Firestore).

---

## Checklist en la consola de Firebase

> Esto es lo único que solo puedes hacer tú (requiere tu cuenta y tarjeta).
> Cuando esté hecho, avísame y conecto el código de subida en la app.

### 1. Activar Cloud Storage (guardar los PDF)
- [console.firebase.google.com](https://console.firebase.google.com) → proyecto **hemopocket** → **Build → Storage → Comenzar**.
- Te pedirá pasar al plan **Blaze** (pago por uso). Ver "Costes" más abajo: en tu
  caso sale **0 €** en la práctica, pero hay que asociar una tarjeta.
- Región: **europe-west** (la misma que tu base de datos).

### 2. Crear Firestore (listado de guías + permisos)
- **Build → Firestore Database → Crear base de datos** → modo **producción** → región **europe-west**.

### 3. Publicar las reglas de seguridad
- Reglas de **Firestore**: pega el contenido de [`firestore.rules`](./firestore.rules)
  en *Firestore → Reglas → Publicar*.
- Reglas de **Storage**: pega el contenido de [`storage.rules`](./storage.rules)
  en *Storage → Reglas → Publicar*.

### 4. Asignar permisos (modelo mixto)
En **Firestore → Iniciar colección** llamada `roles`. Un documento por persona,
usando su **UID** (lo copias de *Authentication → Users*). Campos:

- **Tú (admin global):**
  - `role` (string) = `admin`
- **Responsable de Banco de Sangre:**
  - `role` (string) = `editor`
  - `sections` (array de string) = `bs`
- **Alguien que lleve Trombosis + Citopenias:**
  - `role` (string) = `editor`
  - `sections` (array) = `th`, `cito`

**IDs de sección disponibles:**

| ID | Sección | ID | Sección |
|----|---------|----|---------|
| `inf` | Neutropenia febril e infecciones | `mieloide` | Patología mieloide crónica |
| `uh` | Otras urgencias hematológicas | `mm` | Mieloma y Gammapatías |
| `th` | Trombosis y Hemostasia | `lf` | Linfoma |
| `bs` | Banco de Sangre | `llc` | LLC |
| `cart` | Terapia celular | `ped` | Hematología pediátrica |
| `cito` | Citopenias | `leuc_ag` | Leucemias agudas |

### Áreas especiales: edición de los asistentes

Además de las secciones de guías existen **dos áreas independientes** para editar
los asistentes (no son secciones de guías; se guardan en el mismo array `sections`):

- **`asist_red`** → editar el **Redactor de analíticas y recetas** (diccionario/plantilla
  de analíticas y diccionario de recetas).
- **`asist_qt`** → editar el **Asistente de quimioterapia** (esquemas de QT).

Se asignan por separado: una persona puede tener una, la otra o ambas.

**Forma recomendada (desde la app):** en *Gestión de cuentas*, pon a la persona como
**Editor** y marca las casillas que correspondan: **«✏️ Redactor de analíticas y
recetas»** y/o **«✏️ Asistente de quimioterapia»**. La app escribe el rol por ti.

**Forma manual (en Firestore → `roles/{UID}`),** añadiendo las claves al array
`sections`. Ejemplos:

- **Editor solo del redactor** (analíticas + recetas):
  - `role` (string) = `editor`
  - `sections` (array) = `asist_red`
- **Editor solo de quimioterapia:**
  - `role` (string) = `editor`
  - `sections` (array) = `asist_qt`
- **Editor de Banco de Sangre que además mantiene quimioterapia:**
  - `role` (string) = `editor`
  - `sections` (array) = `bs`, `asist_qt`
- **Administrador** (no necesita nada especial, ya edita todo):
  - `role` (string) = `admin`

> Compatibilidad: la clave antigua `asistentes` (que daba acceso a todo) sigue
> funcionando; al volver a guardar ese perfil desde la app se reparte en `asist_red`
> y `asist_qt`.

> ⚠️ Recuerda **publicar `firestore.rules`** (*Firestore → Reglas → Publicar*) para
> que estos editores puedan guardar «para todos»; si no, sus cambios se quedan solo
> en su equipo. Las admin no se ven afectadas.

---

## Costes del plan Blaze (lo que importa de verdad)

Blaze es "pago por uso", pero incluye una **cuota gratuita mensual**. Solo se
cobra lo que pase de ahí. Órdenes de magnitud (verifica las cifras vigentes en
la [página de precios](https://firebase.google.com/pricing), cambian con el tiempo):

- **Almacenamiento**: las 49 guías ocupan ~130 MB. La cuota gratis es de varios GB
  → **0 €**.
- **Descargas (tráfico)**: es lo único que podría crecer con muchos usuarios. Hay
  ~1 GB/día gratis; pasado eso, ~0,12 $/GB. Para un servicio de hematología,
  realista que te quedes **dentro de lo gratis**.
- **Firestore**: el listado de guías son lecturas mínimas → **0 €**.

**Recomendación**: en la consola de Google Cloud pon una **alerta de presupuesto**
(p. ej. avisar al llegar a 1 €). Así, si algún día el uso se disparara, te enteras
antes de pagar nada relevante.

---

## Cómo quedará el día a día

- **Usuario normal** (con su cuenta): ve y descarga las guías igual que ahora.
  Funciona offline sin cambios.
- **Editor de una sección**: inicia sesión y, **solo en su sección**, le aparecen
  botones **Subir / Sustituir / Eliminar**.
- **Tú (admin)**: lo mismo, en todas las secciones. Dejas de tocar GitHub para las guías.

---

## Migración de las 49 guías actuales

Acordamos pasar todo a Firebase. Cuando el backend esté activo, lo haré con un
script de una sola vez que:
1. Sube cada PDF de `guias/` a `Storage → guias/{seccion}/...` en su sección correcta
   (según el mapa que ya existe en la app).
2. Crea el registro correspondiente en la colección `guias` de Firestore.

A partir de ahí, el listado "fuente de verdad" será Firestore, y la app lo
sincroniza y lo guarda offline igual que hoy.
