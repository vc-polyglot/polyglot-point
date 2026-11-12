# Música desde la administración

En **Admin → Música** se gestionan las grabaciones del reproductor público. La sección comienza con las cuatro piezas existentes, con Meditación III en segundo lugar.

1. Seleccionar un archivo y pulsar **Añadir audio a la lista**. Se admiten MP3, WAV, M4A, OGG, FLAC y WMA, hasta 100 MB y dos horas por archivo.
2. Revisar el título y los datos opcionales de intérprete, autor o lugar. Cada pista dispone de un reproductor de escucha previa.
3. Usar **Subir/Bajar** para cambiar el orden y **Retirar/Recuperar** para cambiar su presencia en el reproductor. Los archivos se conservan.
4. Pulsar **Guardar lista** para publicar todos los cambios. Los visitantes los reciben al iniciar una visita o recargar el sitio. Una lista sin pistas activas oculta el reproductor.

Seleccionar o subir un archivo no modifica por sí solo la lista pública. La consola advierte al salir con cambios pendientes e impide abandonar la sección durante una subida o un guardado. Si otra sesión guardó una versión posterior, el servidor rechaza la sobrescritura y conserva los cambios en pantalla para su revisión.

## Implementación y despliegue

- La lista se guarda en un documento `playlist` con identificador `reproductor-musica`, dentro del almacenamiento existente: PostgreSQL en producción y SQLite en revisión local. Incluye versiones e historial. Abrir la sección no escribe datos ni sobrescribe la lista.
- El servidor inserta únicamente las pistas activas, en su orden publicado, en el HTML del reproductor. Las cuatro pistas iniciales se usan sólo mientras no existe una configuración guardada; una lista vacía guardada no restaura las piezas iniciales. La lista de una sesión de escucha se conserva durante la navegación; las actualizaciones se reciben al recargar la página o abrir una visita nueva.
- Las subidas se validan y convierten a MP3 mediante FFmpeg, sin modificar el original de la computadora. El Dockerfile instala FFmpeg y ffprobe; el entorno local también debe disponer de ambos ejecutables.
- Los audios locales se guardan en la carpeta de subidas de la revisión. En producción se usa la configuración Cloudinary ya utilizada por la biblioteca de imágenes. [Cloudinary almacena los audios con `resource_type: video`](https://cloudinary.com/documentation/upload_parameters#uploading_audio_files); la política de medios del sitio permite su dominio de entrega.
- `GET /api/admin/music` consulta la lista; `PUT /api/admin/music` publica una versión; `POST /api/admin/music/audio` sube y prepara una grabación. Todas las operaciones requieren sesión de administrador; los cambios requieren token CSRF y validación de origen. Sólo pueden publicarse archivos iniciales o audios guardados por el servidor.
- El reproductor conserva el inicio apagado, la ausencia de precarga de audio y la contracción automática tras cuatro segundos. Publicar una lista no inicia sonido en los visitantes ni sustituye una reproducción que ya esté en curso.

Las pruebas cubren conversión real de WAV a MP3, subida y rangos HTTP, persistencia tras reinicio, cambios de orden y título, retirada y recuperación, listas vacías, conflictos de versión, permisos, CSRF y almacenamiento remoto simulado. La conexión real a Cloudinary y la construcción de la imagen Docker requieren comprobación en el despliegue.

## Reproducción continua entre secciones

Los enlaces internos del sitio público cambian el contenido de la sección sin recargar el documento. El elemento de audio y sus controles permanecen montados, por lo que se conservan la pieza seleccionada, el segundo de reproducción, el volumen y el estado de reproducción o pausa. También se conservan al usar Atrás/Adelante del navegador o enlaces a apartados de una página.

La navegación actualiza la dirección, el título, los metadatos, la selección del menú y el contenido del pie de página. Prepara los estilos y los controles propios de la nueva sección, incluidos álbumes, carrusel, lector de Historia y formulario de contacto. Al abandonar una sección se limpian sus escuchas globales, observadores y temporizadores; los del reproductor permanecen activos.

Si falla la carga de una sección, se conserva el contenido anterior y aparece una opción para reintentar; el audio continúa. Los enlaces externos, las descargas, los gestos para abrir una pestaña nueva y la consola admin mantienen su navegación habitual. Cerrar o recargar la pestaña termina la reproducción; una visita nueva sigue empezando apagada.
