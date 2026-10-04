# ADR: tutor de ElevenLabs en el perfil Intern

- Fecha: 2026-10-03 (America/Mexico_City).
- Estado: aceptada; amplía ADR-0010, ADR-mi-espacio-agente y ADR-agent-availability.
- Actor: Codex; operador: soyabrahamarriaga-lang.
- Evidencia: el usuario pidió integrar un segundo agente para enseñar en Intern y proporcionó su ID. La lectura autenticada lo identificó como «Tutor de procesos», no archivado y con voz habilitada.

## Decisión

Senior conserva ELEVENLABS_AGENT_ID; Intern utiliza ELEVENLABS_TUTOR_AGENT_ID. Ambos IDs se resuelven exclusivamente en el backend con la clave existente. El navegador elige una ruta fija, nunca un ID de agente arbitrario. Si falta el tutor, Intern queda sin configurar; no utiliza al experto como sustituto. El selector de perfiles continúa siendo una herramienta de demostración, no una barrera de autorización entre usuarios.

Las rutas /api/elevenlabs/tutor/status, /availability y /session aplican al tutor los mismos controles de origen, consentimiento, código cuando corresponda y límite de intentos. La caché de comprobaciones es independiente por agente. No se emiten credenciales para comprobar disponibilidad; la sesión se confirma con el SDK al iniciar por voz o texto.

Mi aprendizaje incorpora la entrada al tutor y conserva las sesiones de ejemplo. AgentSpace y AgentConversation comparten los controles con Senior, usando textos y destino propios por perfil. Cambiar de perfil desmonta la sesión, los dispositivos y su estado; ninguna respuesta anterior puede confirmar la conexión de otro agente. Los enlaces antiguos conservan el perfil al volver a su inicio.

La conversación de práctica no se importa automáticamente a la bóveda de evidencia del experto desde esta UI ni genera mapas de proceso. La pantalla opcional sigue llegando al tutor cuando la persona la comparte, pero no escribe eventos de aprendizaje en esa bóveda. La retención en ElevenLabs depende de la configuración existente del proveedor.

## Límites

Se integra el agente existente sin modificar sus instrucciones, herramientas, permisos ni fuentes de conocimiento. Las sesiones sintéticas de biblioteca y los mapas de la bóveda no se cargan automáticamente como contexto del tutor. La prueba por texto confirmó saludo, intercambio de mensajes y cierre; el tutor solicitó material de referencia para enseñar el procedimiento concreto. Micrófono físico, reproducción de voz y pantalla no se activaron en esa prueba.

## Ontología y evidencia

Se preservan tutor, learner, agent_conversation y sus invariantes: una conversación de aprendizaje no acredita dominio ni convierte un procedimiento en conocimiento validado. El ID por perfil es configuración de conexión, no una nueva entidad conceptual. Las pruebas de aislamiento, controles de acceso y caché se registran en la bitácora del aporte.
