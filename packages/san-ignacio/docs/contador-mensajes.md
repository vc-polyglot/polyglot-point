# Contador de mensajes en el menú de administración

La opción **Mensajes** del menú lateral muestra el número total de consultas guardadas en la bandeja. Incluye pendientes, atendidas y archivadas. Cambiar el estado de atención no modifica el total; borrar definitivamente una consulta lo reduce. El contador muestra **0** cuando la bandeja está vacía.

Al entrar a la consola se consulta el total mediante `GET /api/admin/messages/count`, un endpoint reservado a administradores y sin caché. El servidor devuelve únicamente `{count}`, calculado con `COUNT(*)` en PostgreSQL o SQLite, sin descargar el contenido de las consultas para actualizar el indicador.

La consola comprueba el total cada 15 segundos mientras la pestaña está visible y al volver a ella o recuperar el foco. Al borrar un mensaje, el indicador baja de inmediato y vuelve a consultar el total para incluir posibles entradas o eliminaciones realizadas desde otra sesión. Abrir Mensajes también sincroniza el contador con la lista recibida. La consulta periódica actualiza el indicador del menú sin recargar formularios ni alterar ediciones en curso.

El contador mantiene su valor al navegar entre secciones. Las respuestas anteriores a una actualización reciente se descartan para evitar que un resultado retrasado reponga un número viejo. Un fallo de conexión conserva el último valor confirmado. Antes de la primera consulta aparece una indicación de carga, en lugar de presentar un cero no comprobado.

El sondeo se suspende en pestañas ocultas y se detiene al salir de la página o cerrar sesión. El indicador tiene una etiqueta accesible y anuncia sus cambios de manera discreta a tecnologías de asistencia. La consola continúa en español.

Las pruebas automatizadas comprueban aumentos y bajas, bandeja vacía, estados atendido/archivado, navegación, visibilidad, errores de red, respuestas fuera de orden y acceso autenticado al conteo. Usan datos de prueba aislados.
