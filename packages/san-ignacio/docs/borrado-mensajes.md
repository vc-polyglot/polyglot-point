# Borrado de mensajes desde la consola

La sección **Mensajes** incorpora un botón **Borrar mensaje** en cada consulta recibida desde el formulario público. Está disponible para mensajes pendientes, atendidos o archivados.

Antes de borrar, la consola solicita confirmación e identifica el asunto y el remitente. Cancelar conserva el mensaje. Confirmar lo elimina definitivamente de la base de datos y de la bandeja, sin guardar ningún otro cambio. La consola comunica el resultado, conserva los demás mensajes y muestra el estado vacío cuando se elimina el último. No hay recuperación desde la consola. Borrar una consulta no envía un correo al visitante.

El endpoint `DELETE /api/admin/messages/:id` requiere sesión de administrador, origen permitido y token CSRF. Utiliza una eliminación parametrizada por identificador y devuelve `204` si borró el mensaje o `404` si ya no existe. Las credenciales permanecen en el servidor.

La actualización de atención usa un `UPDATE` sobre un registro existente. Así, una sesión antigua o una actualización concurrente no puede recrear una consulta que otra persona acaba de borrar. Las operaciones persisten en PostgreSQL en producción y SQLite en revisión local, sin migraciones nuevas.

La confirmación, cancelación, conservación ante errores, prevención de doble envío, accesibilidad del resultado y escape del contenido recibido se verifican con pruebas del panel. Las pruebas HTTP cubren autenticación, origen, CSRF, eliminación selectiva, mensajes archivados, persistencia al reiniciar y cambios de estado concurrentes. Sólo se eliminan consultas generadas en bases de datos de prueba aisladas.
