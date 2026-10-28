# San Ignacio de Loyola, Polanco — revisión local

Sitio institucional con páginas renderizadas en servidor y consola editorial.
La copia de revisión local conserva sus datos en `.local`, fuera de Git.
Los cambios se versionan en `review/san-ignacio-local-20261028`; la rama
`feature/san-ignacio` activa el despliegue del servicio existente en Railway.

## Inicio

En Windows, ejecutar `ABRIR-SAN-IGNACIO.cmd` y abrir
http://127.0.0.1:3310/. La consola está en `/admin`; las credenciales exclusivas
de revisión se encuentran en `.local/ACCESO-LOCAL.txt`.

En una terminal situada en esta carpeta:

```text
npm run local:init
npm start
```

La inicialización es idempotente: conserva los registros que ya existen.
El lanzador también conserva la instancia activa si ya corresponde a esta app.
`DETENER-SAN-IGNACIO.cmd` detiene exclusivamente la instancia que registró.

Node local verificado: 22.17.0, con `node:sqlite`. Las dependencias existentes
se utilizan mediante una unión a `node_modules` del paquete original, sin
modificarlas. Para trasladar esta carpeta, ejecutar `npm ci` en el destino.

## Arquitectura

- `src/review/pages.js`: páginas públicas y estructura compartida.
- `src/review/html.js`: escape, texto y metadatos de imágenes.
- `src/review/model.js`: estados editoriales, revisiones y validación.
- `src/review/store.js`: SQLite local / PostgreSQL alojado.
- `src/server-next.js`: HTTP, sesiones, permisos, contacto y biblioteca.
- `assets/site.css` y `assets/site.js`: interfaz pública.
- `assets/admin.css` y `assets/admin.js`: consola.
- `assets/images`: derivados; los originales se conservan en `public/img`.
- `public`, `private` y rutas anteriores se conservan como referencia, pero
  el servidor nuevo sólo sirve explícitamente `assets` y las subidas locales.

El contenido publicado y su borrador son versiones separadas. Se guardan hasta
40 revisiones por registro. Archivar no elimina datos. El control de versión
rechaza sobrescrituras concurrentes. Las vistas previas requieren sesión.

## Almacenamiento y sesiones

`LOCAL_REVIEW_MODE=1` usa `.local/site.sqlite` y subidas en `.local/uploads`.
Las sesiones locales están en memoria: reiniciar conserva datos y requiere
ingresar de nuevo. El servidor local escucha exclusivamente en loopback.
El modo local se rechaza si `NODE_ENV=production`.

El camino alojado usa PostgreSQL y Redis. Su esquema nuevo se prepara
explícitamente con `npm run db:migrate`; el arranque no ejecuta semillas ni
migraciones automáticas. La migración nueva es aditiva. Antes de aplicarla se
requieren respaldo y restauración de prueba de la base existente.

La subida alojada requiere las variables Cloudinary existentes. Si no están
configuradas, la consola devuelve un error claro sin anunciar guardado.
La subida local y las pruebas de imágenes no usan servicios remotos.

## Validación ejecutada

```text
npm run check
npm test
npm run backup:local
```

Pasaron 17 escenarios de HTTP y persistencia, más una prueba de migración
aislada. Node informa 19 tests contando el contenedor de los escenarios.
Se verificaron además las diez páginas, sus anclas y 59 recursos referenciados.
Se restauró un respaldo en una carpeta nueva con 52 registros e integridad OK.

Las pruebas usan bases separadas dentro de `.local/qa-*` y
`.local/migration-qa-*`; nunca la base de revisión ni Railway.

No se han ejecutado pruebas visuales de navegador, interacción táctil,
Lighthouse o integración real con PostgreSQL/Redis/Cloudinary en esta sesión.
El navegador controlable y el acceso conectado a Railway siguen pendientes.

## Contenido y migración

La referencia local proviene de archivos existentes. No se debe asumir que
contiene las últimas publicaciones de Railway. Su procedencia se conserva
en cada registro y en `.local/import-inventory.json`.

`scripts/export-legacy.mjs archivo.json` exporta tablas de contenido desde la
base existente mediante una transacción de sólo lectura. La conexión se
configura en el entorno como `LEGACY_DATABASE_URL`, sin incluirla en argumentos.
No exporta contraseñas de usuarios; las cuentas originales permanecen intactas.

`scripts/import-legacy.mjs archivo.json` lleva esa exportación a las tablas
editoriales nuevas. Exige un destino vacío y conserva la exportación completa.
Debe comprobarse en un entorno aislado antes de cualquier uso alojado.

La exportación de contenido no reemplaza un respaldo integral de PostgreSQL
ni de sus archivos remotos. Consulte `RAILWAY-PREPARACION.txt` para los límites
y el procedimiento pendiente, incluidos los campos que requieren cotejo.

## Respaldo local

`npm run backup:local` utiliza la API consistente de respaldo de SQLite y copia
subidas y acceso local. Incluye un manifiesto SHA-256.

```text
node scripts/restore-local.mjs carpeta-del-respaldo carpeta-nueva-dentro-de-.local
```

La restauración verifica todos los hashes y rechaza sobrescribir carpetas.
Para iniciar la copia restaurada, configurar `LOCAL_DATA_PATH` con esa carpeta
en un proceso de revisión separado. No reemplazar manualmente una base abierta.

## Pendientes antes de desplegar

Completar la revisión visual de móvil y escritorio, cotejar los datos reales,
validar la integración alojada y recibir el contenido institucional pendiente.
Donativos y privacidad permanecen en borrador hasta disponer de información
confirmada. No se han realizado pushes ni despliegues.


## Despliegue autorizado en Railway — 28 de octubre de 2026

El servicio existente despliega la rama `feature/san-ignacio` mediante
`Dockerfile.san-ignacio` en la raíz del monorepositorio. La imagen usa Node 24.
El comando de arranque conserva `npm run db:migrate && npm start`.

La migración prepara las tablas editoriales nuevas y copia el contenido anterior
sin actualizar ni eliminar las tablas originales. Antes guarda y verifica una
instantánea con SHA-256 en `san_ignacio.site_migration_backups`. Todo ocurre en
una transacción. Una marca evita repetir la importación; una consola ya poblada
se conserva. Las filas de la base alojada tienen prioridad sobre los contenidos
institucionales de referencia. Los usuarios existentes no cambian de contraseña.

El script `scripts/publish-railway.ps1` sube sin forzar la rama, activa el
servicio existente y espera su comprobación HTTP, PostgreSQL y Redis. No cambia
la configuración comercial de Railway. La migración cuenta con pruebas de
planificación, transacción, integridad, idempotencia y reversión con un cliente
SQL simulado; su ejecución real se confirma en los registros de Railway.

Una reversión de código puede volver al commit anterior `cecb8f2`; las tablas
anteriores permanecen intactas. No se deben borrar las nuevas tablas ni sus
respaldos como parte de una reversión. Conservar también la historia Git.
