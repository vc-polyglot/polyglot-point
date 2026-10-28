# Pendientes editoriales y de publicación

Actualizado el 28 de octubre de 2026.

## Contenido que requiere confirmación
- Confirmar si «Evitado» es el título correcto del concierto del 29 de septiembre de 2024. Se conserva el texto del CV.
- Cotejar el nombre del solista de «El arte de la trompeta»: el CV indica Olivier Sánchez y el INBAL Josué Olivier. Fecha confirmada por Víctor: una sola función el 31 de mayo de 2025.
- Dar obra, compositor, lugar y año para los cuatro videos seleccionados.
- Proporcionar portada real, créditos completos y enlaces oficiales del disco de Linae Occultae. No se han inventado enlaces de compra.
- Completar lugares, años y créditos de las fotografías. Los pies actuales describen solo lo observable.
- Añadir próximos conciertos cuando puedan anunciarse. No se han convertido recitales pasados en eventos futuros.
- Añadir entradas de Ahora y Cuaderno cuando exista contenido aprobado; por ahora estas secciones permanecen ocultas.

## Antes de publicar
- Validar visualmente escritorio y móvil; el acceso automatizado al navegador no estuvo disponible.
- Verificar el commit y el Dockerfile efectivos del servicio victor-web en Railway. La rama local no es la rama conectada a producción.
- Comprobar Resend y los valores de CONTACT_TO_EMAIL y CONTACT_FROM_EMAIL; no se cambiaron variables ni se envió correo real.
- Construir y probar la imagen Docker de Node 24 en un entorno de ensayo.
- Publicar únicamente tras revisar la versión local; no se ha hecho push, merge ni deploy.

## Realizado en la versión local
- Respaldo externo verificado y originales intactos.
- CV actualizado, 146 referencias históricas y fecha de trompeta corregida.
- HTML reconstruido, nueva presentación, galería accesible, videos diferidos y formulario con errores visibles.
- Derivados ligeros de imagen, archivo con búsqueda e idiomas, CV imprimible y descarga de texto.
- Respuestas 404 reales, bloqueo de copias de respaldo, healthcheck y despliegue específico reproducible preparado.
- Pruebas locales sin dependencias nuevas ni envíos externos.
