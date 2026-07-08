# HemoPocket — Guía para Claude

## ⚡ Preferencia permanente: publicar de inmediato

**Cada vez que se hace un cambio en la app, hay que PUBLICARLO de inmediato en producción, sin esperar a que lo pida.** La autora ya lo ha autorizado expresamente y de forma repetida.

Flujo de publicación tras cualquier cambio:
1. Ejecutar `./bump.sh` para subir el número de build (sincroniza `sw.js` y `HP_BUILD`).
2. Ejecutar `node scripts/health-check.mjs` para validar (11 bloques de script, versión coherente, reglas).
3. Commit + push a la rama de trabajo.
4. **Fusionar a `main` de inmediato** (GitHub Pages sirve `main`; el service worker actualiza los clientes solos al detectar el nuevo build).
5. Si hay conflictos con `main` (p. ej. porque avanzó con otra build), rebasar sobre `main`, resolver, volver a subir el build y continuar.

No dejar cambios "pendientes de merge": el objetivo es que la app en producción refleje siempre el último cambio.

## Arquitectura (resumen)
- App autocontenida en `HemoPocket_app.html` (~15,8k líneas: CSS + JS + datos embebidos).
- PWA con service worker (`sw.js`); backend Firebase (Auth, Firestore, Storage, Messaging).
- El número de build vive en dos sitios y **debe ir siempre sincronizado**: usar `./bump.sh` (nunca editar a mano).
- Listín telefónico: datos base en `const HOSP_DIR` (línea larga única) + ediciones en la nube (Firestore `directorio`). Se muestra en formato «Título» y solo la extensión interna.
- Despliegue: GitHub Pages sirve `main`. Los workflows (`.github/workflows/`) corren al hacer push/merge a `main`.
