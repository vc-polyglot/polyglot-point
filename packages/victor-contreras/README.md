# Víctor Contreras · sitio profesional

Sitio multipágina estático servido por Express. La portada conserva acceso por anclas y contiene un archivo curricular completo incluso sin JavaScript. Las interacciones añaden idiomas, búsqueda, video y galería; no ocultan contenido como requisito de inicialización.

## Desarrollo y comprobación

Desde este paquete, con las dependencias existentes:

```powershell
npm start
npm test
python -B tools/check-site.py
```

No se necesitan dependencias de frontend. Las pruebas usan `node:test`, servidores HTTP efímeros en loopback y un proveedor de correo simulado. No envían correos reales.

La vista de revisión de esta tarea se abrió en `http://127.0.0.1:4313`, vinculada únicamente al equipo local y con el envío real de correo desactivado. Si el proceso ya no está activo, se puede iniciar desde este paquete con:

```powershell
node -e "require('./backend').createApp({env:{}}).listen(4313,'127.0.0.1')"
```

## Contenido y publicación de archivos estáticos

- `public/data/agenda.json`: conciertos y recitales. `date` solo acepta una fecha completa verificada; `period` admite `AAAA-MM`; `dateLabel` conserva fechas parciales o intervalos. `sortYear` organiza el archivo, sin inventar una fecha de concierto. `category`: `organ` o `conducting`. `status: archived` conserva referencias históricas; `canceled` se muestra como cancelación.
- `public/data/cv.json`: formación, cursos, nombramientos, premios, idiomas y prensa del CV recibido el 28 de octubre de 2026.
- `public/data/ahora.json`: actualidad con `publishedAt` y, opcionalmente, `expiresAt`. No se muestra antes de publicarse. Las entradas sin fecha o con más de 120 días se ocultan salvo caducidad explícita.
- `public/data/cuaderno.json`: entradas de cuaderno; admite textos por idioma mediante objetos `es`, `en`, `fr`, `it`.
- `tools/build-page.py`: plantilla de la portada y CV. Después de cambiar datos o textos, ejecutar `npm run build:content`. Genera `index.html`, `cv.html` y el CV de texto con contenido accesible sin JavaScript. Revisar siempre el diff generado.
- `public/css/modern.css`: diseño activo. `site.css` se conserva como referencia anterior y no se carga.
- `public/js/site.js`: idiomas, galería, video y formulario. `content-engine.js` trata datos y fechas; `content-renderer.js` añade la vista dinámica.

La portada usa un retrato de dirección ya existente. Las fotografías originales permanecen intactas. `tools/Optimize-Images.ps1` genera derivados JPEG con System.Drawing de Windows y un manifiesto; no reemplaza los originales. Las miniaturas se sirven en la galería y la versión de mayor tamaño solo se solicita al ampliarla.

## Contacto

Contacto visible autorizado en el CV: `victoropus24@yahoo.com.mx`, `+52 55 3217 4080`.

El formulario requiere `RESEND_API_KEY` y `CONTACT_TO_EMAIL`; `CONTACT_FROM_EMAIL` es opcional y debe pertenecer a un dominio validado en Resend. No se han creado ni cambiado variables de Railway. Si falta configuración, devuelve 503 y ofrece el correo directo. El éxito requiere aceptación del proveedor, lo cual no equivale a una comprobación de llegada a la bandeja final.

El servicio asume un proxy de entrada de Railway (`trust proxy: 1`). Revisar ese número si se añade otra capa de proxy. La limitación por IP es local al proceso y se reinicia con él; para varias réplicas se necesita un mecanismo compartido.

## Despliegue pendiente de autorización

La rama local es `feature/victor-catalogo-vivo`; la configuración suministrada de Railway conecta `release/auth-stripe-db`. No asumir que esta copia está publicada. Identificar el commit real de Railway antes de integrar cambios.

El archivo específico es `/Dockerfile.victor-contreras`; el Dockerfile general corresponde a otra app. El específico usa Node 24, `npm ci --omit=dev`, el puerto `PORT` o 3003 y `/healthz`. Copia únicamente los archivos servidos y sus derivados, sin las fotos originales ni archivos `.backup`. No se ha construido ni desplegado la imagen Docker durante esta tarea.

No hay cambios en otros paquetes ni comandos de push. Las comprobaciones de navegador, correo real y configuración efectiva de Railway siguen siendo requisitos antes de publicar.

## Respaldo y recuperación

El respaldo previo verificado se encuentra fuera del repo:

`../victor-catalogo-vivo-backups/repair-20261028-131310/source-before.zip`

La ruta se interpreta desde la carpeta raíz `victor-catalogo-vivo`. Su `manifest.json` registra 50 archivos y sus SHA-256. Incluye fuentes, datos, originales y manifiestos del sitio antes de la intervención. No incluye credenciales de Railway, dependencias instaladas ni el historial Git completo.

Para crear otra copia independiente del sitio:

```powershell
python -B tools/backup.py
```

El script crea un ZIP y verifica su CRC y todos sus hashes. Nunca elimina ni restaura archivos.

Para recuperar: extraer el ZIP en una carpeta nueva; verificar archivos contra `manifest.json`; comparar con la copia operativa; restaurar únicamente los archivos elegidos después de revisar las diferencias. Para reconstruir el servidor se usa el `package-lock.json` incluido. La configuración de Resend y Railway se recupera por separado desde sus respectivas cuentas. No ejecutar una restauración directamente encima de trabajo sin respaldar.

Los worktrees locales comparten metadatos Git con otros repositorios: no son respaldos independientes del historial. No borrar ni mover su repositorio padre.
