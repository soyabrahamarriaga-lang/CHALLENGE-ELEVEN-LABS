# Conectar una bóveda local al sitio público

## Uso

1. Abrir la URL pública de UserHelper en Chrome o Edge de escritorio (HTTPS). Obsidian es opcional para ver las notas y Canvas; el menú permite descargar sus instaladores oficiales.
2. Pulsar **Conectar carpeta** y seleccionar la raíz de la bóveda, no su subcarpeta `.obsidian`. Aceptar lectura y escritura en el diálogo del navegador. Una carpeta vacía también sirve para nuevas sesiones.
3. Biblioteca, Guardadas y Mapas leen los procesos de UserHelper de esa carpeta. Las notas arbitrarias de Obsidian no se convierten automáticamente en procesos.
4. Iniciar una conversación de Senior. El navegador copia los mensajes recibidos durante esta visita y las capturas de pantalla compartidas a `Sesiones/AAAA-MM-DD-ID/`. Al terminar escribe un borrador de procedimiento, evidencias y Canvas; usa el mismo derivador local que el servidor. No consulta el análisis posllamada del proveedor. Una conversación sin acciones explícitas se declara sin procedimiento identificado.
5. **Desconectar carpeta** detiene el acceso de la aplicación. Al recargar/cerrar la pestaña hay que seleccionar la carpeta de nuevo. Cada computadora y cada pestaña autorizan su propia carpeta; no se almacena el handle en IndexedDB ni en el servidor.

La primera selección y autorización se completan personalmente en el diálogo del navegador. Safari, Firefox y navegadores móviles pueden no ofrecer esta API; en esos casos se explica la compatibilidad y siguen funcionando los agentes.

## Alcance de datos

- Los archivos de la bóveda no se envían a Vercel ni se añaden a la base de conocimiento remota del tutor. Voz, mensajes y pantalla explícitamente compartida siguen enviándose a ElevenLabs conforme al aviso de conversación existente.
- El historial guardado es el que recibió esta pestaña, no una importación de conversaciones anteriores del proveedor. Se copia incrementalmente para conservar lo recibido, incluido más de 200 turnos; un cierre abrupto puede dejar una sesión incompleta. El guardado depende del permiso y del espacio de disco, y sus fallos se muestran.
- La configuración existente del perfil Intern sigue sin archivar prácticas en la bóveda del experto. Conectar una carpeta no modifica prompts ni voces ni el conocimiento del tutor.
- No se escriben notas personales ni configuración de Obsidian. Metadatos editables se guardan en `process-metadata.json` sin sobrescribir Canvas o notas editadas. Retirar un proceso crea el marcador `Retirados/ID.json`, compatible con el backend local; conserva originales y no modifica el material remoto de ElevenLabs.
- Formato compatible: `Sesiones/AAAA-MM-DD-ID/process-flow.json` versión 2, metadatos, capturas y Canvas. Se respeta `catalogo-procesos.json`. Los archivos inválidos se reportan; no se reinterpretan como código. Hay límites de lectura/guardado de 4 MiB por archivo, 3 MiB por imagen, 200 capturas por sesión y 2000 entradas de sesiones.
- La conexión queda fijada al empezar la conversación. Cambiar o desconectar la carpeta no redirige una grabación en curso a otra bóveda. Las escrituras pendientes vuelven a comprobar conexión y permiso.

## Arquitectura y prueba

`BrowserVault` implementa el almacenamiento mediante File System Access; los servicios de procesos eligen este adaptador en el build público. Las rutas de bóveda del servidor Vercel permanecen deshabilitadas. El generador puro de procesos se comparte con Node y usa SHA-256 compatible para mantener identificadores. El backend local conserva su servicio e importación del proveedor.

Las pruebas ejercitan el contrato de handles contra carpetas temporales reales en disco, con permisos simulados: conservación de archivos, lectura/edición/retiro, capturas, aislamiento de rutas, desconexión, permiso revocado, transcripciones extensas, catálogo y documentos inválidos. El selector real fue abierto en el navegador integrado; su diálogo nativo no pudo operarse por la restricción de acceso de la herramienta a la app Codex. No se declara probada esa autorización ni una grabación física completa.

Referencias: [File System Access, Chrome](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), [showDirectoryPicker, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker).
