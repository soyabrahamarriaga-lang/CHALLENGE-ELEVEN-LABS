# ADR: Idioma seleccionado explícito en el prompt del agente

- Estado: aceptado e implementado.
- Fecha: 2026-10-04.
- Autor: Codex; operador: Abraham (`soyabrahamarriaga-lang`).
- Sustituye únicamente los puntos 4–5 de ADR-bilingual-interface; conserva sus demás decisiones y su historia.

## Contexto

El proveedor recibió `language: en` en una sesión real de Senior, pero el LLM contestó español después del saludo inglés. El usuario solicitó que seleccionar English determinara el idioma de respuesta y excluyó expresamente cualquier cambio relacionado con voces de fondo.

## Decisión

Capturar el idioma de la UI antes de solicitar acceso y llevarlo en `FrameSession.language` hasta el iframe. El SDK recibe `dynamicVariables.conversation_language` como `English` o `Spanish`, además del override de idioma cuando difiere del principal. El iframe valida ambos códigos; no toma instrucciones libres del navegador. Para clientes anteriores en caché, ausencia del campo nuevo usa el override existente o el español original.

Actualizar solo la política de idioma de los prompts remotos y el placeholder `conversation_language`. La política al final usa `{{conversation_language}}` y dice expresamente que una pregunta o fuente en otro idioma no cambia la selección. El placeholder de prueba coincide con el idioma principal español. No habilitar override de prompt ni modificar el resto de la configuración. Leer de nuevo después del PATCH para comprobar preservación, con respaldo privado previo.

Una sesión conserva su idioma durante toda su duración. Si el usuario cambia el selector con una conversación activa, el aviso existente indica que se aplicará a la siguiente. No se corta la llamada ni se fragmenta su evidencia automáticamente.

## Alternativas y evidencia

El override solo no bastó en Senior. Una primera política dinámica breve resolvió Senior pero Intern volvió al español ante una pregunta española; la política final, al final del prompt y explícita sobre no imitar el idioma del mensaje, pasó los cuatro casos ES/EN y las dos preguntas cruzadas. Reemplazar el modelo o duplicar agentes no era necesario. Sobrescribir el prompt desde el cliente requeriría ampliar permisos y expondría instrucciones; se conserva el prompt administrado en ElevenLabs.

## Consecuencias, límites y ontología

La UI y el prompt comparten ahora una preferencia por sesión; no se agregan entidades ni se traducen fuentes canónicas. El idioma enviado no es un secreto. Las instrucciones del agente son configuración externa: hay que conservar la variable al editarlas. No se garantiza el comportamiento de un LLM en todas las conversaciones; el reporte de disponibilidad verifica acceso/configuración, no el contenido de cada respuesta.

Pruebas del SDK para voz/texto, principal/adicional y mensajes inválidos; cuatro conversaciones reales de texto ES/EN con ambos perfiles y preguntas españolas en sesiones inglesas. Voz física y pronunciación no comprobadas. La configuración de ruido, VAD, turnos, modelos, voces, herramientas, conocimiento y permisos queda intacta. Datos sintéticos y respaldos remotos permanecen fuera del repositorio público.
