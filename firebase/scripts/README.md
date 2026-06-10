# Migración de cuentas existentes

`migrar_cuentas.js` crea una ficha **aprobada** en la colección `cuentas` para cada
usuario que ya exista en **Firebase Authentication**. Sirve para que, cuando actives el
**modo estricto** de las reglas, los usuarios actuales no pierdan el acceso.

Es **idempotente**: si un usuario ya tiene ficha, no la modifica. Puedes ejecutarlo las
veces que quieras.

## Requisitos

- **Node.js 18+** instalado.
- Una **clave de cuenta de servicio** del proyecto `hemopocket`:
  - Consola de Firebase → ⚙️ *Configuración del proyecto* → *Cuentas de servicio* →
    **Generar nueva clave privada**. Se descarga un `.json`.
  - Guárdalo en esta carpeta como **`serviceAccountKey.json`** (ya está en `.gitignore`,
    **no se sube al repositorio**), o define la variable de entorno
    `GOOGLE_APPLICATION_CREDENTIALS` con su ruta.

> ⚠️ Esta clave da acceso total al proyecto. No la compartas ni la subas a git.

## Pasos

```bash
cd firebase/scripts
npm install
# 1) Primero, en seco (no escribe nada, solo muestra qué haría):
node migrar_cuentas.js --dry-run
# 2) Si te parece bien, ejecútalo de verdad:
node migrar_cuentas.js
```

## Después de migrar

1. Comprueba en *Firestore → cuentas* que aparecen las fichas con `estado: "aprobada"` y
   `migrado: true`.
2. (Opcional) **Modo estricto**: en `firebase/firestore.rules` y `firebase/storage.rules`,
   en la función `isApproved()`, **quita la excepción `|| !hasAccount()`** (Firestore) y
   `|| hasNoAccount()` (Storage). Vuelve a publicar las reglas. A partir de entonces, solo
   los usuarios con cuenta **aprobada** (o admin/editor) podrán leer el contenido.

## Notas

- Las fichas migradas se marcan con `aceptaTerminos: false` y `versionTerminos: "preexistente"`
  porque esos usuarios no aceptaron los términos a través del nuevo formulario. Si quieres
  que también consten como aceptados, puedes pedir que vuelvan a entrar (verán el aviso de
  aceptación) o ajustar el script.
- El script no crea ni borra usuarios de Authentication; solo añade fichas en Firestore.
