# Consola de secretaría — estado vigente del 7 de noviembre de 2026

Esta versión sustituye la propuesta anterior de administración completa. Hay un único panel web, destinado a la secretaria. No hay otro panel, modo avanzado, rol técnico ni ruta para administrar diseño desde la web. El contenido permanente se mantiene por código.

## Menú

1. Inicio: eventos próximos, avisos vigentes, publicaciones guardadas y dos accesos principales: Crear evento y Publicar aviso.
2. Eventos: nombre, fecha, hora, lugar, descripción y fotografía. La hora de finalización es opcional. Un evento se puede usar como base para otro, con la nueva fecha por completar.
3. Avisos y noticias: título, texto, fotografía opcional y día de retiro automático. Se pueden programar para una fecha posterior.
4. Imágenes: dos colecciones reutilizables, Fotografías y Carteles y materiales. Dentro de la misma sección se accede a la galería publicada; no hay otro panel.
5. Pastoral: crear y editar fichas de grupos, catecismo y actividades pastorales; actualizar textos y horarios; elegir una fotografía principal y ordenar fotografías del archivo.
6. Mensajes: consultas recibidas, con estado Pendiente, Atendido o Archivado.
7. Horarios y contacto: horarios habituales de misa y datos de la oficina. Para una excepción de un día, se utiliza Avisos.

Los botones son Guardar para después, Ver cómo quedará y Publicar. Ver cómo quedará guarda el borrador y abre su vista privada. Si el navegador bloquea la ventana, se ofrece un enlace a la vista previa. Guardar un borrador conserva la publicación anterior.

Retirar se puede revertir mediante la opción Mostrar: Retirados en la misma sección. Recuperar conserva el borrador sin republicarlo automáticamente. No se eliminan fotografías originales.

## Contenido fuera del panel

Agua de San Ignacio, Música permanente, Historia, Memorias, fuentes históricas, rectores, directorio, estructura de Pastoral, sacramentos, textos institucionales, portada, donativos, privacidad y configuración interna se mantienen por código. Un concierto se anuncia en Eventos; no requiere modificar Música.

No aparecen números de orden, categorías técnicas, rutas de imágenes, procedencias, historial detallado ni descargas de respaldo. La selección de fotografías se abre detrás de Elegir foto. Se conserva el ojo para mostrar y ocultar la contraseña.

## Permisos reales

La misma cuenta habitual utiliza el único panel. La API limita lecturas y escrituras a eventos, avisos, galería, fichas de Pastoral, horarios existentes y la ficha contacto. Se rechazan también las vistas previas de contenido permanente, los intentos de modificar campos internos, los cambios de tipo, los identificadores inventados para registros nuevos, las altas de nuevos horarios y el acceso a respaldos. Las restricciones se aplican en el servidor, incluso si se intenta llamar a las rutas manualmente con una sesión de administración.

Los datos permanentes no se borraron. Los historiales completos siguen conservados en el almacenamiento para recuperaciones por código. La edición genérica del modelo permanece disponible para herramientas internas; no existe una ruta web alternativa que la exponga.

## Revisión local

Código canónico: packages/san-ignacio, sobre 8ccc5cf.

Vista: http://127.0.0.1:3310/admin

La vista utiliza una instantánea aislada en .local/admin-design-review-20261107; conserva el correo y la contraseña configurados previamente. El acceso está documentado sólo en su ACCESO-LOCAL.txt, fuera de Git. No se escribieron datos de prueba en esta vista ni se alteró la base original.

Arranque preparado: node .local/admin-design-preview.mjs

El cierre de esta entrega se versiona en feature/san-ignacio por solicitud del usuario. Este documento no certifica un despliegue en Railway ni una copia de los datos locales a producción.

## Verificación

- Sintaxis de los 41 archivos activos.
- Suite de 125 pruebas aprobadas, sin fallos. Se excluye expresamente la prueba antigua del logotipo que requiere un archivo externo en Downloads.
- La suite HTTP comprueba el menú de siete entradas, los permisos con la cuenta habitual, la conservación del contenido permanente, eventos, avisos programados y vencidos, fotografías, retirada y recuperación, horarios y contacto, conflictos concurrentes, CSRF, consultas y persistencia tras reiniciar.
- Las pruebas usan bases separadas bajo .local/qa-*. No prueban una integración real con los servicios de producción.
- El control del navegador había permanecido indisponible; la comprobación visual no se sustituye por la suite HTTP.

## Ajuste basado en las capturas de Facebook

El menú vigente tiene siete entradas: Inicio, Eventos, Pastoral, Avisos y noticias, Imágenes, Mensajes y Horarios y contacto.

- Fotografías y Carteles y materiales se guardan como colecciones del mismo archivo. No se duplican ni se mueven físicamente los originales. La clasificación persiste en registros de metadatos, sin una migración de esquema.
- Se pueden subir hasta 20 imágenes a la vez, con un máximo de 8 MB por archivo, y buscarlas por nombre o descripción. Los archivos no se publican al subirlos.
- Eventos y avisos/noticias admiten hasta 20 imágenes, con selección múltiple, orden, descripciones y elección de la principal. La vista pública permite ampliarlas y recorre sólo las imágenes de esa publicación. Los carteles se muestran completos.
- La galería pública sólo acepta imágenes del archivo Fotografías. Para mover una fotografía ya publicada a Carteles y materiales hay que retirarla antes de la galería. Se comprueban versiones al reclasificar para evitar sobrescrituras.
- Eventos permiten un enlace para participar o ver una transmisión. Avisos y noticias pueden incluir un enlace informativo y no exigen fecha. Sólo se admiten enlaces HTTPS.
- Tanto eventos como avisos/noticias se pueden reutilizar como base para otra publicación, revisando de nuevo las fechas. Retirar o vencer una publicación conserva las imágenes del archivo.
- Los escenarios nuevos verifican persistencia de las colecciones tras reiniciar, separación del archivo y la publicación, protección de la galería, conflictos de clasificación, portada y orden de múltiples imágenes, vista previa, retirada y rechazo de imágenes repetidas o sin descripción y de enlaces inseguros.

Las capturas se usaron como referencia de necesidades. No se importaron automáticamente publicaciones, carteles ni fotografías de Facebook. Los datos de prueba siguen limitados a las bases aisladas de QA.

## Pastoral: gestión cotidiana autorizada posteriormente

Se añadió Pastoral al mismo panel de secretaría. Ya se pueden crear y modificar fichas, seleccionar su apartado (Catecismo, Áreas pastorales o Grupos y comunidad), actualizar nombre, descripción, horario y nota, elegir fotografías desde el archivo existente, ordenar las imágenes y seleccionar la principal. El diseño y la estructura visual siguen definidos por código; no se muestran controles de orden de página ni parámetros técnicos.

El álbum se muestra también en las fichas de Catecismo. Los álbumes actuales de Jóvenes y Adultos Mayores se ofrecen al editor sin sembrar ni sobrescribir sus registros. Una edición de texto conserva esas imágenes. Las fotografías de un programa pueden retirarse explícitamente y el sitio respeta un álbum vacío. Los programas retirados se pueden recuperar sin volver a publicarse automáticamente.

Pastoral permite seleccionar y guardar imágenes de las dos colecciones: Fotografías y Carteles y materiales. No se exige moverlas ni duplicarlas para utilizarlas en una ficha. La restricción a fotografías sólo se conserva al alimentar la galería pública. Los programas de formación se clasifican por el apartado elegido, conservando las reglas heredadas cuando una ficha carece de clasificación.

El caso INEA se verificó en una base aislada: fotografía procedente de la galería, borrador separado de la publicación, vista previa, cambio de principal, conservación del orden institucional y retirada sin eliminar la imagen. También se comprobaron fichas nuevas con fotografías en los tres apartados y la conservación de los álbumes existentes. No se asignó una fotografía a INEA en la vista de revisión por inferencia; la secretaria puede elegir la correcta.

Corrección posterior: se eliminó la limitación errónea que ocultaba Carteles y materiales al abrir el selector desde Pastoral. La regresión comprueba las dos pestañas y la selección de un cartel en el propio controlador del selector, además de su guardado, vista previa y publicación en INEA sin cambiar de colección.

## Reclasificación desde el selector

El control Mover a ya estaba en la sección Imágenes, pero no en la ventana que abre Elegir imágenes desde Pastoral. Se añadió un botón por miniatura y el movimiento de la selección a cualquiera de los dos archivos. Los mensajes aparecen dentro del selector y las selecciones se conservan al mover. El destino de una subida se llama Guardar nuevas imágenes en para distinguirlo de reclasificar imágenes ya guardadas. El formulario de subida se abre plegado al elegir imágenes existentes, y desplegado cuando se solicita subir archivos.

La reclasificación mantiene las mismas direcciones, originales y asignaciones a publicaciones. Si una imagen todavía pertenece a la galería pública, el servidor conserva la condición de retirarla de esa galería antes de pasarla a Carteles y materiales; cualquier rechazo se explica en la misma ventana. Se probaron los movimientos en ambos sentidos y la conservación de una imagen cuando el servidor rechaza el cambio.

## Permanencia en Admin y acceso directo

Mover imágenes conserva ahora la colección abierta y la búsqueda. Sólo las tarjetas movidas correctamente se desvanecen; después las tarjetas restantes se reacomodan. La animación se omite cuando se prefiere movimiento reducido. El archivo de destino se visita únicamente si la persona pulsa su pestaña.

Los controles Volver y el Atrás normal del navegador usan un historial interno de Admin. Atrás cierra primero el selector; después regresa de la ficha al listado. Al llegar al inicio permanece en la administración. Se conserva la advertencia por cambios sin guardar. El acceso y las vistas previas tienen también un regreso dentro de Admin. Los enlaces que permiten consultar el sitio público abren otra pestaña. Al restaurar una página privada desde la caché de navegación se solicita una recarga que revalida la sesión en el servidor.

Se retiró el enlace Administración del pie de todas las páginas públicas. La ruta /admin se conserva como acceso directo al formulario de la secretaria. No se configuró ni compró un dominio nuevo. Ocultar el enlace no es el mecanismo de autorización: el servidor sigue exigiendo sesión para los datos y las operaciones privadas.

La revisión local comprueba rechazo de lecturas y escrituras anónimas de documentos, imágenes y mensajes, rechazo de cookies inventadas, redirección de vistas previas al acceso, invalidación de la sesión anterior al login, controles de origen y CSRF y cierre de sesión. Estos resultados no constituyen una auditoría exhaustiva ni una verificación remota de la infraestructura de producción.

## Agenda y portada — 10 de noviembre de 2026

El apartado Eventos ahora se llama Agenda y conserva los mismos registros, permisos y formularios. Publicar una actividad alimenta su ficha, la agenda completa y el carrusel de la portada, situado inmediatamente debajo de los horarios de misa. La imagen principal elegida en el formulario es también la del carrusel; las demás permanecen en la ficha. No se crea otro contenido ni otra subida.

La portada muestra las cinco actividades próximas por fecha. Si hay una sola, aparece fija; sin actividades, el bloque no aparece. El cambio automático funciona cada ocho segundos en escritorio, con pausa, indicadores, flechas y teclado. En móvil y con movimiento reducido el avance es manual. Interactuar detiene el cambio automático; pasar el puntero, ocultar la pestaña o sacar el bloque de la pantalla lo pausa.

Admin, Agenda y portada comparten el criterio de vigencia: fecha final si existe; si no, final del día de inicio en Ciudad de México. Al finalizar se conserva la actividad entre los encuentros anteriores. La sección de grabaciones se consulta en Música y ya no se repite en Agenda.
