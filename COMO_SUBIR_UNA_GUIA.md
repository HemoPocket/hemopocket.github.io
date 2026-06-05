# Cómo subir o cambiar una guía (PDF) en HemoPocket

Guía rápida para añadir, sustituir o quitar un PDF de guía clínica.
**No hace falta tocar el código de la app.** Solo dos cosas:

1. Poner el **PDF** en la carpeta `guias/`.
2. Apuntarlo en el fichero **`hemopocket.json`** (raíz del repo).

Cuando esto llega a la rama `main`, la web se actualiza y **los usuarios reciben
la guía solos la próxima vez que abran la app con Internet** (queda guardada para
usarla sin cobertura).

---

## Paso 1 — Subir el PDF

- Mete el archivo en la carpeta **`guias/`**.
- Nombre sin espacios ni acentos (ej.: `Mieloma_2026.pdf`, no `Guía Mieloma.pdf`).

## Paso 2 — Apuntarlo en `hemopocket.json`

Dentro de `hemopocket.json`, las guías están en `"subtypes"`, organizadas por
**sección**. Cada sección tiene una lista de **subtipos**, y cada subtipo tiene
una lista de **PDFs** así:

```json
{
  "id": "fol",
  "name": "Linfoma Folicular",
  "pdfs": [
    { "name": "Guía Linfoma Folicular GELTAMO", "url": "guias/Folicular.pdf" }
  ]
}
```

- `name` (dentro de `pdfs`) = el texto que verá el usuario.
- `url` = `guias/` + el nombre exacto del archivo que subiste.

### Caso A — Añadir un PDF a una sección que ya existe
Busca el subtipo adecuado y **añade una línea más** dentro de su `pdfs`:

```json
"pdfs": [
  { "name": "Guía Linfoma Folicular GELTAMO", "url": "guias/Folicular.pdf" },
  { "name": "Nueva guía 2026", "url": "guias/Folicular_2026.pdf" }
]
```
> Cuida las **comas**: hay coma entre elementos, pero **no** después del último.

### Caso B — Crear un subtipo nuevo dentro de una sección
Añade un bloque nuevo a la lista de esa sección. El `id` debe ser **corto y
único** dentro de la sección (sin espacios):

```json
{
  "id": "nuevo_subtipo",
  "name": "Nombre que verá el usuario",
  "pdfs": [
    { "name": "Mi guía", "url": "guias/MiGuia.pdf" }
  ]
}
```

### Sustituir o quitar una guía
- **Sustituir:** sube el PDF nuevo y cambia su `url` (o reemplaza el archivo con el mismo nombre).
- **Quitar:** borra esa línea de `pdfs`. En la app desaparecerá sola al sincronizar.

## Paso 3 (recomendado) — Subir la fecha/versión
Arriba del todo de `hemopocket.json` está `"version"`. Cámbiala (p. ej. la fecha
del día) para que en la app se vea reflejada la actualización:

```json
"version": "2026.06.05-repo1",
```

## Paso 4 — Publicar
Guarda los cambios, haz **commit** y que lleguen a la rama **`main`**
(es la que publica `hemopocket.github.io`). En 1–3 minutos está en la web y los
usuarios la reciben automáticamente al abrir con Internet.

---

## Referencia: identificadores de sección

| `id`       | Sección en la app                 |
|------------|-----------------------------------|
| `inf`      | Neutropenia febril e infecciones  |
| `uh`       | Otras urgencias hematológicas     |
| `th`       | Trombosis y Hemostasia            |
| `bs`       | Banco de Sangre                   |
| `cart`     | Terapia celular                   |
| `cito`     | Citopenias                        |
| `leuc_ag`  | Leucemias agudas                  |
| `mieloide` | Patología mieloide crónica        |
| `mm`       | Mieloma y Gammapatías             |
| `lf`       | Linfoma                           |
| `llc`      | LLC                               |
| `ped`      | Hematología pediátrica            |

## Errores típicos a evitar
- **Comas mal puestas** en el JSON (la causa nº 1 de que no cargue). Una coma entre elementos, ninguna tras el último.
- **`url` que no coincide** con el nombre real del archivo (mayúsculas/acentos cuentan).
- Olvidar que el cambio **debe llegar a `main`** para verse en la web.

> Consejo: si quieres comprobar que el JSON es válido antes de publicar, pega su
> contenido en https://jsonlint.com y pulsa "Validate".
