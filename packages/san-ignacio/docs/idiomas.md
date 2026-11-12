# Idiomas del sitio público

El encabezado ofrece un único selector global **ES · EN · FR**. El español es la versión base. Una carga nueva del sitio comienza en español, aunque el navegador prefiera inglés o francés. La elección no se guarda en cookies ni en almacenamiento local o de sesión.

Al seleccionar inglés, francés o español, el idioma se aplica al contenido institucional, la navegación, los metadatos, los formularios, los mensajes y los controles accesibles de todo el sitio público. La elección acompaña la navegación interna y Atrás/Adelante. Cambiar de idioma no crea una sección nueva en el historial ni pierde la posición de lectura, los apartados abiertos o los datos escritos en el formulario de contacto.

El elemento de audio permanece montado. Cambiar de idioma conserva su pista, posición, volumen y estado de reproducción o pausa. Los rótulos se actualizan sin llamar de nuevo a reproducir, pausar o cargar el archivo. Si una solicitud falla, se conserva la página y puede reintentarse el cambio con el mismo idioma.

## Originales y administración

- Los archivos gráficos, carteles y documentos históricos escaneados conservan su contenido original en español. Los textos institucionales transcritos de Historia sí cuentan con traducción.
- Los títulos y cuerpos de los avisos se conservan en español y se identifican con `lang="es"`. Sus controles y la interfaz general se traducen.
- Los nombres propios, direcciones electrónicas, archivos, identificadores y títulos originales de las piezas musicales se conservan.
- La consola admin y sus vistas previas continúan en español y no ofrecen el selector público.

## Implementación

La navegación envía el encabezado `X-Site-Language` únicamente después de una elección explícita; admite `es`, `en` o `fr`. El servidor devuelve `Content-Language`, declara `Vary: X-Site-Language` y renderiza las fechas en el idioma elegido conservando la zona horaria de Ciudad de México. No se utilizan redirecciones por idioma ni servicios externos de traducción.

`assets/i18n-catalog.js` contiene las traducciones en inglés y francés, con el texto español como clave. `assets/i18n.js` resuelve los textos y los rótulos variables. La localización del HTML modifica sólo textos y atributos semánticos; conserva URLs, scripts, identificadores y regiones marcadas `data-original-spanish`. El contexto de idioma del servidor se aísla por solicitud.

Las traducciones institucionales están preparadas a partir del contenido de referencia del proyecto. Si se añade o cambia un texto institucional, debe incorporarse su traducción al catálogo; un texto nuevo sin entrada conserva su original, sin inventar una traducción. Los avisos pueden seguir publicándose directamente en español. La auditoría se ejecuta con:

```powershell
node scripts/audit-languages.mjs
```

Las pruebas cubren las tres versiones, los capítulos de Historia, los requisitos de sacramentos, la conservación de avisos y archivos, el inicio español independiente de las preferencias del navegador, la separación de solicitudes simultáneas, la navegación, los cambios rápidos de idioma, los reintentos y la continuidad del reproductor. La revisión visual en navegador y el contenido más reciente de producción deben cotejarse después del despliegue.
