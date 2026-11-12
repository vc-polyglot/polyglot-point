# Borrado de imágenes y canciones desde la consola

La consola de administración incorpora **Borrar imagen** en las tarjetas de Fotografías y Carteles y materiales, tanto en el archivo como en el selector de imágenes. Música incorpora **Borrar canción** junto a los controles de orden y Retirar/Recuperar. Estos controles permanecen en español.

Cada borrado solicita confirmación con el nombre del archivo. Al confirmar se aplica inmediatamente, sin pulsar Guardar lista. No se puede recuperar el archivo desde la consola; puede volverse a subir el original como un archivo nuevo. El original en la computadora del administrador se conserva.

## Imágenes en uso

El servidor revisa las referencias en borradores, publicaciones y fichas retiradas, además de las imágenes permanentes del diseño. Si encuentra usos, rechaza el borrado e indica las publicaciones que deben actualizarse primero. Las versiones históricas no impiden el borrado. Las variantes de tamaño de una misma imagen se reconocen como un solo archivo.

Una imagen borrada desaparece del archivo y del selector. Si estaba seleccionada en el formulario abierto, se quita de esa selección sin descartar las demás ediciones. El servidor también rechaza formularios antiguos que intenten guardar referencias al archivo borrado.

## Música

**Retirar** desactiva una pista de manera reversible; requiere Guardar lista. **Borrar canción** la elimina de la lista guardada y del archivo del sitio al confirmar. Las otras ediciones pendientes de títulos, orden o selección se conservan sin publicarse; el aviso de cambios pendientes sigue activo cuando corresponde. Una versión antigua de la lista produce un conflicto y conserva las ediciones del formulario.

Los visitantes reciben la nueva lista al iniciar una visita o recargar el sitio, como ocurre con las demás modificaciones del repertorio. El borrado no controla el audio que otro navegador ya descargó ni obliga a interrumpir una reproducción en curso. La navegación pública continua y el selector global de idiomas mantienen su funcionamiento.

## Almacenamiento y consistencia

- Las operaciones `DELETE /api/admin/images` y `DELETE /api/admin/music/audio` exigen sesión de administrador, origen permitido, token CSRF y control de versión.
- Una transacción registra el borrado persistente. En música también actualiza la lista en esa misma transacción. Los guardados posteriores comprueban que no incorporen referencias a archivos borrados. PostgreSQL serializa las escrituras de documentos; la revisión local usa una cola y transacciones SQLite.
- Los archivos subidos en revisión local se eliminan de la carpeta de subidas mediante rutas restringidas a esa carpeta. Los subidos a Cloudinary se eliminan con `destroy` e invalidación de caché; imágenes usan `resource_type: image` y audios `resource_type: video`. Sólo se aceptan recursos de la cuenta configurada y de las carpetas del sitio. Véase la [documentación de eliminación de Cloudinary](https://cloudinary.com/documentation/delete_assets).
- Si falla la limpieza física, el archivo queda excluido del catálogo y de la lista. La API devuelve `202`, la consola explica que la limpieza está pendiente y el servidor reintenta al arrancar y cada minuto. Si termina correctamente devuelve `200`. La invalidación de copias en la CDN puede tardar en propagarse.
- Los archivos incluidos originalmente en el repositorio se excluyen mediante un registro de borrado y sus direcciones dejan de servirse. Los binarios originales permanecen en Git y en la imagen del despliegue; no se modifica el repositorio desde el admin. El estado persistente impide que reaparezcan tras reiniciar o desplegar de nuevo.
- Los registros de borrado conservan autor, fecha, dirección, tipo de almacenamiento y estado de limpieza. No aparecen entre las publicaciones administrables.

## Validación

Pruebas automatizadas del servicio, controles de administración y API HTTP cubren confirmación/cancelación, permisos, CSRF, versiones, referencias en uso, ediciones pendientes, limpieza local, llamadas remotas simuladas, reintentos, escrituras concurrentes y persistencia tras reiniciar. Las pruebas usan datos de revisión aislados; no borran archivos del sitio en producción. La eliminación real en Cloudinary requiere validación tras el despliegue con un archivo de prueba.
