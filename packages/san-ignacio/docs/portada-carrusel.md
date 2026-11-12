# Carrusel fotográfico exclusivo de portada

La imagen principal de la portada mantiene el Cristo con los vitrales de San Ignacio de Loyola. Después de ocho segundos comienza una secuencia cíclica de fotografías, con una transición de opacidad de 1.2 segundos entre cada imagen cargada. La selección inicial contiene el Cristo, la fachada de día y los vitrales de noche. No se mueve el encuadre durante las transiciones.

La secuencia pertenece a una configuración independiente, `carrusel-portada`, de tipo `home-slideshow`. No se obtiene de los eventos, noticias, personas del equipo ni de las publicaciones de la galería. Subir una fotografía al archivo o publicarla en otra sección no la incorpora automáticamente a la portada. La selección del tema de cada foto se realiza manualmente.

## Administración

En **Imágenes → Imágenes de portada**, la secretaría puede añadir fotografías del archivo, ordenar las imágenes adicionales y quitarlas de la portada. El Cristo permanece fijo al inicio y no se puede quitar ni desplazar. La selección admite de una a doce fotografías; guardar solamente el Cristo deja una portada estática. Quitar una foto de esta selección no la borra del archivo.

Los cambios se publican al pulsar **Guardar imágenes de portada**. La configuración persiste en PostgreSQL en producción y en SQLite en la revisión local. Las API `GET /api/admin/home-slides` y `PUT /api/admin/home-slides` exigen sesión de administrador; guardar requiere también origen permitido y token CSRF. La versión de la configuración evita sobrescribir cambios hechos desde otra sesión. Un conflicto conserva las ediciones pendientes.

El servidor comprueba la primera imagen, los límites de cantidad, las descripciones, los duplicados y la pertenencia al archivo Fotografías. Las imágenes utilizadas por la portada quedan protegidas contra el borrado del archivo. Primero deben quitarse de la selección; la imagen principal permanece protegida. Tampoco se permite mover una imagen activa de portada a Carteles y materiales.

## Presentación pública

Los controles discretos dentro de la fotografía permiten retroceder, pausar o reanudar y avanzar. El contador indica la posición actual. La intervención manual pausa el avance automático. La preferencia de movimiento reducido desactiva la rotación automática y la transición animada, conservando las flechas manuales.

El avance se detiene mientras la pestaña está oculta o la fotografía queda fuera de la vista. Al salir de la sección se limpian los temporizadores y se cancela una transición pendiente. Si una imagen adicional no carga, se conserva la actual y se omite la fallida en los siguientes avances. Sólo la primera foto tiene prioridad de carga; las adicionales se solicitan al necesitarlas.

La primera imagen vuelve a ser el Cristo al montar de nuevo la portada. La música conserva su reproductor global y su estado durante la navegación; el carrusel no modifica el audio ni inicia música automáticamente. Los controles públicos y las descripciones institucionales iniciales tienen traducciones ES, EN y FR. El admin permanece en español.

## Validación

Las pruebas automatizadas cubren la selección independiente, primera imagen fija, una sola foto, permisos, CSRF, conflicto de versiones, persistencia, imágenes en uso, transición, pausa, navegación manual, movimiento reducido, errores de carga y salida de sección. La integración conserva las pruebas de música continua e idiomas. Las pruebas utilizan datos locales aislados.

La revisión visual mediante el navegador no pudo completarse: la herramienta detuvo el control al no poder confirmar la URL de la ventana. No se modificó el contenido en producción durante esta implementación.
