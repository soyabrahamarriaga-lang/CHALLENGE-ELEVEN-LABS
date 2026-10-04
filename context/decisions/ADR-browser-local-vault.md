# ADR: Bóveda por computadora mediante permisos del navegador

- Fecha: 2026-10-04.
- Estado: aceptado; petición explícita del operador Abraham, implementación Codex.
- Modifica ADR-vercel-conversation-demo: habilita persistencia local desde la web cuando el usuario selecciona una carpeta. Conserva Vercel sin filesystem de bóveda. Complementa ADR-vercel-open-agent-access.

## Contexto y decisión

Después de habilitar instaladores de Obsidian, el usuario solicita conectar la bóveda al sitio web únicamente en la computadora que la selecciona. Se usa File System Access de navegadores compatibles en HTTPS. La persona selecciona y autoriza lectura/escritura; la aplicación conserva el handle solo en memoria de esa pestaña. Recargar exige reconexión explícita. Se descartan la instalación de un puente HTTP local, sincronización por nube y persistir automáticamente el permiso.

El adaptador lee procesos del formato existente y escribe mensajes recibidos, capturas autorizadas y borradores de nuevas conversaciones de Senior. El generador puro se comparte con el backend sin importar APIs Node en el navegador; SHA-256 conserva los identificadores. No inventa evidencia ni importa el análisis remoto: derivación local explícitamente provisional. Mantiene metadatos y retiro recuperable de procesos.

## Privacidad y consecuencias

No hay upload de la carpeta ni lectura de notas arbitrarias para el agente. El tutor remoto no aprende ni olvida automáticamente por operaciones en esta carpeta; la UI lo declara, incluido el retiro de procesos. La voz y el contenido compartido de la conversación mantienen el contrato existente de ElevenLabs. La copia recibida por el navegador puede ser incompleta ante cierre o desconexión. Los archivos existentes y las notas manuales se preservan; no se sobrescribe una transcripción previa con el mismo ID.

Permisos y conexión se comprueban antes de leer/escribir, y antes de cerrar la escritura. Un cambio de carpeta no mueve una grabación activa. Rutas restringidas al árbol elegido, validación de formatos y límites de tamaño/entradas. Controles de desconexión y errores visibles. Fuera de soporte de File System Access se conservan conversaciones sin archivos locales.

## Ontología y verificación

No introduce entidades ni equipara notas de Obsidian con procedimientos validados. Amplía la ubicación autorizada de la colección a una carpeta por pestaña. El retiro local excluye procesos de estas vistas y de una futura compilación del backend local que lea sus marcadores, sin afirmar actualización remota del tutor. Resultados de pruebas y límites del selector nativo se registran en la bitácora y docs/LOCAL-BROWSER-VAULT.md.
